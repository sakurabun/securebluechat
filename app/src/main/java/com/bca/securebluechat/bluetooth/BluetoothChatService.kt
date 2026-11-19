package com.bca.securebluechat.bluetooth

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothServerSocket
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.SystemClock
import androidx.core.content.ContextCompat
import com.bca.securebluechat.crypto.CryptoManager
import com.bca.securebluechat.data.MessageStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.SocketTimeoutException
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

enum class ConnState {
    IDLE, LISTENING, CONNECTING, NEEDS_PIN, CHAT
}

data class PeerDevice(val name: String, val address: String)

data class ChatMessage(
    val id: Long,
    val text: String,
    val fromMe: Boolean,
    val failed: Boolean = false,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * 1-to-1 Bluetooth Classic (RFCOMM) chat service.
 *
 * Roles:
 *  - Host: calls startListening(), accepts one connection, generates + sends the salt.
 *  - Client: calls connect(address), reads the salt.
 *
 * After the socket is up both sides sit in NEEDS_PIN until the user enters
 * the same PIN on both phones. handshake(pin) then derives the AES key,
 * runs a challenge-response to prove both PINs match, and starts the
 * encrypted read loop.
 *
 * Wire protocol: one Base64 line per message, newline terminated. The plain
 * text inside each sealed line is "type\u0001body", where type is "C" for a
 * chat message and "T" for a typing beacon.
 */
@SuppressLint("MissingPermission")
class BluetoothChatService(context: Context) {

    companion object {
        private const val SERVICE_NAME = "SecureBlueChat"
        private val SERVICE_UUID: UUID =
            UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        private const val HANDSHAKE_TIMEOUT_MS = 60_000
        private const val TYPE_SEPARATOR = '\u0001'
        private const val TYPE_CHAT = "C"
        private const val TYPE_TYPING = "T"
        private const val TYPING_THROTTLE_MS = 1_500L
        private const val TYPING_STOP_MS = 2_500L
        private const val PREFS = "securebluechat"
        private const val KEY_PEER_NAME = "last_peer_name"
        private const val KEY_PEER_ADDRESS = "last_peer_address"
    }

    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val store = MessageStore(appContext)
    private val adapter: BluetoothAdapter? =
        (appContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter

    private val _state = MutableStateFlow(ConnState.IDLE)
    val state: StateFlow<ConnState> = _state

    private val _status = MutableStateFlow("Bluetooth is idle")
    val status: StateFlow<String> = _status

    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages

    private val _peerTyping = MutableStateFlow(false)
    val peerTyping: StateFlow<Boolean> = _peerTyping

    private val _peers = MutableStateFlow<List<PeerDevice>>(emptyList())
    val peers: StateFlow<List<PeerDevice>> = _peers

    private var serverSocket: BluetoothServerSocket? = null
    private var socket: BluetoothSocket? = null
    private var reader: BufferedReader? = null
    private var writer: BufferedWriter? = null
    private var salt: ByteArray? = null
    private var key: ByteArray? = null
    private var isHost = false
    private var handshakeRunning = false
    private var discoveryReceiver: BroadcastReceiver? = null
    private val msgId = AtomicLong(System.currentTimeMillis() * 1_000)
    private val lock = Any()

    private val typingExec = Executors.newSingleThreadScheduledExecutor()
    private val typingLock = Any()
    private var lastTypingSentAt = 0L
    private var typingStopTask: ScheduledFuture<*>? = null

    /** Restored from disk so the saved conversation survives an app restart. */
    private val _lastPeer = MutableStateFlow<PeerDevice?>(
        prefs.getString(KEY_PEER_ADDRESS, null)?.let { address ->
            PeerDevice(prefs.getString(KEY_PEER_NAME, null) ?: "Paired phone", address)
        }
    )
    val lastPeer: StateFlow<PeerDevice?> = _lastPeer

    /** Number of stored messages for [lastPeer]; drives the home-screen card. */
    private val _savedCount = MutableStateFlow(0)
    val savedCount: StateFlow<Int> = _savedCount

    var lastWasHost = false
        private set

    init {
        _lastPeer.value?.let { peer ->
            Thread {
                _savedCount.value = store.count(peer.address)
            }.start()
        }
    }

    val isBluetoothEnabled: Boolean get() = adapter?.isEnabled == true

    // ---------- discovery ----------

    fun startDiscovery() {
        val ad = adapter
        if (ad == null) {
            _status.value = "Bluetooth not supported on this device"
            return
        }
        if (!ad.isEnabled) {
            _status.value = "Turn on Bluetooth first"
            return
        }
        stopDiscovery()
        _peers.value = emptyList()
        ad.bondedDevices?.forEach { addPeer(it) }

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                when (intent.action) {
                    BluetoothDevice.ACTION_FOUND -> {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
                            ?.let { addPeer(it) }
                    }
                    BluetoothAdapter.ACTION_DISCOVERY_STARTED ->
                        _status.value = "Scanning nearby devices..."
                    BluetoothAdapter.ACTION_DISCOVERY_FINISHED ->
                        _status.value = if (_peers.value.isEmpty())
                            "No devices found - tap Scan again"
                        else "Tap a device to connect"
                }
            }
        }
        discoveryReceiver = receiver
        ContextCompat.registerReceiver(
            appContext,
            receiver,
            IntentFilter().apply {
                addAction(BluetoothDevice.ACTION_FOUND)
                addAction(BluetoothAdapter.ACTION_DISCOVERY_STARTED)
                addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
            },
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        ad.cancelDiscovery()
        ad.startDiscovery()
        _status.value = "Scanning nearby devices..."
    }

    fun stopDiscovery() {
        discoveryReceiver?.let {
            try {
                appContext.unregisterReceiver(it)
            } catch (_: Exception) {
            }
        }
        discoveryReceiver = null
        try {
            adapter?.cancelDiscovery()
        } catch (_: Exception) {
        }
    }

    private fun addPeer(device: BluetoothDevice) {
        val address = device.address ?: return
        if (_peers.value.any { it.address == address }) return
        val name = try {
            device.name ?: "Unknown device"
        } catch (_: Exception) {
            "Unknown device"
        }
        _peers.value = _peers.value + PeerDevice(name, address)
    }

    // ---------- connection ----------

    fun startListening() {
        val ad = adapter
        if (ad == null) {
            _status.value = "Bluetooth not supported on this device"
            return
        }
        if (!ad.isEnabled) {
            _status.value = "Turn on Bluetooth first"
            return
        }
        closeSockets()
        _state.value = ConnState.LISTENING
        _status.value = "Waiting for the other phone to connect..."

        Thread {
            try {
                serverSocket = ad.listenUsingRfcommWithServiceRecord(SERVICE_NAME, SERVICE_UUID)
                val accepted = serverSocket?.accept()
                    ?: throw IllegalStateException("Server socket closed")
                closeServerSocket()
                prepareSession(accepted, hostSide = true)
            } catch (e: Exception) {
                if (_state.value == ConnState.LISTENING) {
                    _status.value = "Could not listen: ${e.message}"
                    _state.value = ConnState.IDLE
                }
            }
        }.start()
    }

    fun connect(address: String) {
        val ad = adapter
        if (ad == null) {
            _status.value = "Bluetooth not supported on this device"
            return
        }
        if (!ad.isEnabled) {
            _status.value = "Turn on Bluetooth first"
            return
        }
        closeSockets()
        stopDiscovery()
        _state.value = ConnState.CONNECTING
        _status.value = "Connecting..."

        Thread {
            try {
                val device = ad.getRemoteDevice(address)
                val s = device.createRfcommSocketToServiceRecord(SERVICE_UUID)
                s.connect()
                prepareSession(s, hostSide = false)
            } catch (e: Exception) {
                try {
                    socket?.close()
                } catch (_: Exception) {
                }
                _status.value = "Connection failed: ${e.message}"
                _state.value = ConnState.IDLE
            }
        }.start()
    }

    private fun prepareSession(s: BluetoothSocket, hostSide: Boolean) {
        socket = s
        isHost = hostSide
        reader = BufferedReader(InputStreamReader(s.inputStream, Charsets.UTF_8))
        writer = BufferedWriter(OutputStreamWriter(s.outputStream, Charsets.UTF_8))

        val remote = s.remoteDevice
        val remoteAddress = remote.address
        val remoteName = try {
            remote.name ?: "Unknown device"
        } catch (_: Exception) {
            "Unknown device"
        }
        _lastPeer.value = PeerDevice(remoteName, remoteAddress)
        prefs.edit()
            .putString(KEY_PEER_NAME, remoteName)
            .putString(KEY_PEER_ADDRESS, remoteAddress)
            .apply()
        lastWasHost = hostSide
        _peerTyping.value = false
        // Bring back the saved conversation with this phone, if there is one.
        _messages.value = store.load(remoteAddress)
        _savedCount.value = _messages.value.size

        try {
            if (hostSide) {
                val freshSalt = CryptoManager.newSalt()
                salt = freshSalt
                writeLine(android.util.Base64.encodeToString(freshSalt, android.util.Base64.NO_WRAP))
            } else {
                val line = reader?.readLine()
                    ?: throw IllegalStateException("Connection closed during setup")
                salt = android.util.Base64.decode(line, android.util.Base64.NO_WRAP)
            }
            _status.value = "Connected - enter the same PIN on both phones"
            _state.value = ConnState.NEEDS_PIN
        } catch (e: Exception) {
            _status.value = "Setup failed: ${e.message}"
            _state.value = ConnState.IDLE
            closeSockets()
        }
    }

    // ---------- PIN handshake ----------

    fun handshake(pin: String) {
        if (_state.value != ConnState.NEEDS_PIN || handshakeRunning) return
        handshakeRunning = true
        _status.value = "Verifying PIN..."

        Thread {
            try {
                socket ?: throw IllegalStateException("Not connected")
                val sessionSalt = salt ?: throw IllegalStateException("No salt")
                val derived = CryptoManager.deriveKey(pin, sessionSalt)

                if (isHost) {
                    val token = "VERIFY-${System.nanoTime()}"
                    writeLine(CryptoManager.encrypt(token, derived))
                    val reply = reader?.readLine()
                        ?: throw IllegalStateException("Connection lost")
                    val echoed = CryptoManager.decrypt(reply, derived)
                    if (echoed != token) throw IllegalStateException("Token mismatch")
                } else {
                    val challenge = reader?.readLine()
                        ?: throw IllegalStateException("Connection lost")
                    val token = try {
                        CryptoManager.decrypt(challenge, derived)
                    } catch (wrongPin: Exception) {
                        val junk = android.util.Base64.encodeToString(
                            CryptoManager.newSalt() + CryptoManager.newSalt(),
                            android.util.Base64.NO_WRAP
                        )
                        try {
                            writeLine(junk)
                        } catch (_: Exception) {
                        }
                        throw wrongPin
                    }
                    writeLine(CryptoManager.encrypt(token, derived))
                }

                key = derived
                _status.value = "Connected and encrypted (AES-256-GCM)"
                _state.value = ConnState.CHAT
                startReadLoop()
            } catch (e: Exception) {
                key = null
                if (socket != null) {
                    _status.value = "Wrong PIN? Re-enter the same PIN on both phones"
                    _state.value = ConnState.NEEDS_PIN
                }
            } finally {
                handshakeRunning = false
            }
        }.start()
    }

    // ---------- messaging ----------

    fun send(text: String) {
        val sessionKey = key ?: return
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        Thread {
            try {
                writeLine(seal(TYPE_CHAT, trimmed, sessionKey))
                addMessage(trimmed, fromMe = true)
                sendTyping(false)
            } catch (e: Exception) {
                _status.value = "Send failed: ${e.message}"
            }
        }.start()
    }

    // ---------- typing indicator ----------

    /** Called on every keystroke; throttled so we do not flood the socket. */
    fun notifyTyping() {
        if (_state.value != ConnState.CHAT) return
        val now = SystemClock.elapsedRealtime()
        var announce = false
        synchronized(typingLock) {
            if (now - lastTypingSentAt >= TYPING_THROTTLE_MS) {
                lastTypingSentAt = now
                announce = true
            }
            typingStopTask?.cancel(false)
            typingStopTask = typingExec.schedule(
                { sendTyping(false) },
                TYPING_STOP_MS,
                TimeUnit.MILLISECONDS
            )
        }
        if (announce) sendTyping(true)
    }

    private fun sendTyping(typing: Boolean) {
        val sessionKey = key ?: return
        typingExec.execute {
            try {
                writeLine(seal(TYPE_TYPING, if (typing) "1" else "0", sessionKey))
            } catch (_: Exception) {
            }
        }
    }

    private fun seal(type: String, body: String, sessionKey: ByteArray): String =
        CryptoManager.encrypt(type + TYPE_SEPARATOR + body, sessionKey)

    private fun startReadLoop() {
        Thread {
            try {
                while (true) {
                    val line = reader?.readLine() ?: break
                    val sessionKey = key ?: break
                    val plain = CryptoManager.decrypt(line, sessionKey)
                    val split = plain.indexOf(TYPE_SEPARATOR)
                    val type = if (split > 0) plain.substring(0, split) else TYPE_CHAT
                    val body = if (split > 0) plain.substring(split + 1) else plain
                    if (type == TYPE_TYPING) {
                        _peerTyping.value = body == "1"
                    } else {
                        _peerTyping.value = false
                        addMessage(body, fromMe = false)
                    }
                }
                if (socket != null) {
                    _status.value = "Peer disconnected"
                    _state.value = ConnState.IDLE
                    closeSockets()
                }
            } catch (e: SocketTimeoutException) {
                if (socket != null) {
                    _status.value = "Connection timed out"
                    _state.value = ConnState.IDLE
                    closeSockets()
                }
            } catch (e: Exception) {
                addMessage("Could not decrypt incoming message", fromMe = false, failed = true)
                _status.value = "Decryption failed - PINs may not match"
                _state.value = ConnState.IDLE
                closeSockets()
            }
        }.start()
    }

    // ---------- helpers / lifecycle ----------

    private fun writeLine(line: String) {
        synchronized(lock) {
            val w = writer ?: throw IllegalStateException("Not connected")
            w.write(line)
            w.newLine()
            w.flush()
        }
    }

    private fun addMessage(text: String, fromMe: Boolean, failed: Boolean = false) {
        val msg = ChatMessage(
            id = msgId.incrementAndGet(),
            text = text,
            fromMe = fromMe,
            failed = failed
        )
        _messages.update { it + msg }
        _savedCount.update { it + 1 }
        _lastPeer.value?.let { store.append(it.address, msg) }
    }

    // ---------- saved history ----------

    /** Shows the stored conversation without opening a Bluetooth session. */
    fun openSavedChat() {
        val peer = _lastPeer.value ?: return
        _peerTyping.value = false
        _messages.value = emptyList()
        Thread {
            val saved = store.load(peer.address)
            _savedCount.value = saved.size
            _messages.value = saved
            _status.value = "Showing saved conversation with ${peer.name}"
        }.start()
    }

    fun deleteMessage(messageId: Long) {
        _messages.update { list -> list.filterNot { it.id == messageId } }
        _savedCount.update { (it - 1).coerceAtLeast(0) }
        _lastPeer.value?.let { store.remove(it.address, messageId) }
    }

    fun clearChat() {
        val peer = _lastPeer.value
        _messages.value = emptyList()
        _savedCount.value = 0
        _peerTyping.value = false
        if (peer != null) {
            store.clear(peer.address)
            _status.value = "Chat history cleared"
        }
    }

    private fun closeServerSocket() {
        try {
            serverSocket?.close()
        } catch (_: Exception) {
        }
        serverSocket = null
    }

    private fun closeSockets() {
        try {
            socket?.close()
        } catch (_: Exception) {
        }
        socket = null
        reader = null
        writer = null
        salt = null
        key = null
        handshakeRunning = false
        _peerTyping.value = false
        synchronized(typingLock) {
            typingStopTask?.cancel(false)
            typingStopTask = null
        }
    }

    fun stop() {
        stopDiscovery()
        closeServerSocket()
        closeSockets()
        _status.value = if (_lastPeer.value != null)
            "Disconnected - tap Reconnect to continue"
        else "Bluetooth is idle"
        _state.value = ConnState.IDLE
    }
}
