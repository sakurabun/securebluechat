package com.bca.securebluechat.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import com.bca.securebluechat.bluetooth.ChatMessage
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * On-device, encrypted chat history.
 *
 * The Bluetooth session key is ephemeral (it dies with the socket), so history
 * is sealed with a separate AES-256-GCM key that never leaves the Android
 * Keystore. One encrypted file is kept per peer address:
 *
 *   iv (12 bytes) || AES-GCM( JSON array of messages )
 *
 * Nothing is ever written in plain text, and the file is unreadable on any
 * other device because the Keystore key is non-exportable and device bound.
 */
class MessageStore(context: Context) {

    companion object {
        private const val TAG = "MessageStore"
        private const val ALIAS = "sbc_history_key"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val IV_SIZE = 12
        private const val TAG_BITS = 128
        private const val MAX_MESSAGES_PER_PEER = 500
    }

    private val dir = File(context.applicationContext.filesDir, "history").apply { mkdirs() }
    private val io = Executors.newSingleThreadExecutor()
    private val cache = HashMap<String, MutableList<ChatMessage>>()

    @Volatile
    private var cachedKey: SecretKey? = null

    /** Reads the conversation with [peerAddress] from disk (cached after first call). */
    @Synchronized
    fun load(peerAddress: String): List<ChatMessage> {
        val list = cachedList(peerAddress)
        return list.toList()
    }

    @Synchronized
    fun append(peerAddress: String, message: ChatMessage) {
        val list = cachedList(peerAddress)
        list += message
        while (list.size > MAX_MESSAGES_PER_PEER) list.removeAt(0)
        persist(peerAddress, list)
    }

    @Synchronized
    fun remove(peerAddress: String, messageId: Long) {
        val list = cachedList(peerAddress)
        list.removeAll { it.id == messageId }
        persist(peerAddress, list)
    }

    @Synchronized
    fun clear(peerAddress: String) {
        cache[peerAddress] = mutableListOf()
        val file = fileFor(peerAddress)
        io.execute {
            runCatching { file.delete() }
        }
    }

    @Synchronized
    fun clearAll() {
        cache.clear()
        val files = dir.listFiles()?.toList().orEmpty()
        io.execute {
            files.forEach { runCatching { it.delete() } }
        }
    }

    @Synchronized
    fun count(peerAddress: String): Int = cachedList(peerAddress).size

    // ---------- internals ----------

    private fun cachedList(peerAddress: String): MutableList<ChatMessage> =
        cache.getOrPut(peerAddress) { readFile(peerAddress) }

    private fun persist(peerAddress: String, list: List<ChatMessage>) {
        val snapshot = list.toList()
        io.execute { writeFile(peerAddress, snapshot) }
    }

    private fun fileFor(peerAddress: String) =
        File(dir, peerAddress.replace(Regex("[^A-Za-z0-9]"), "_") + ".bin")

    private fun secretKey(): SecretKey {
        cachedKey?.let { return it }
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val existing = (keyStore.getEntry(ALIAS, null) as? KeyStore.SecretKeyEntry)?.secretKey
        if (existing != null) {
            cachedKey = existing
            return existing
        }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generator.generateKey().also { cachedKey = it }
    }

    private fun writeFile(peerAddress: String, messages: List<ChatMessage>) {
        try {
            val array = JSONArray()
            messages.forEach { msg ->
                array.put(
                    JSONObject()
                        .put("id", msg.id)
                        .put("text", msg.text)
                        .put("me", msg.fromMe)
                        .put("failed", msg.failed)
                        .put("at", msg.timestamp)
                )
            }
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, secretKey())
            val iv = cipher.iv
            val body = cipher.doFinal(array.toString().toByteArray(Charsets.UTF_8))
            val target = fileFor(peerAddress)
            val temp = File(target.parentFile, target.name + ".tmp")
            temp.writeBytes(iv + body)
            // Rename is atomic on Android, so a reader never sees a half-written file.
            if (!temp.renameTo(target)) {
                target.delete()
                if (!temp.renameTo(target)) temp.delete()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Could not save history", e)
        }
    }

    private fun readFile(peerAddress: String): MutableList<ChatMessage> {
        val file = fileFor(peerAddress)
        if (!file.exists()) return mutableListOf()
        return try {
            val data = file.readBytes()
            require(data.size > IV_SIZE) { "History file too short" }
            val iv = data.copyOfRange(0, IV_SIZE)
            val cipherText = data.copyOfRange(IV_SIZE, data.size)
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(TAG_BITS, iv))
            val json = String(cipher.doFinal(cipherText), Charsets.UTF_8)
            val array = JSONArray(json)
            MutableList(array.length()) { index ->
                val obj = array.getJSONObject(index)
                ChatMessage(
                    id = obj.optLong("id"),
                    text = obj.optString("text"),
                    fromMe = obj.optBoolean("me"),
                    failed = obj.optBoolean("failed"),
                    timestamp = obj.optLong("at")
                )
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not read history, starting empty", e)
            mutableListOf()
        }
    }
}
