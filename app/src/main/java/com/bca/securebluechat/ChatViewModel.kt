package com.bca.securebluechat

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import com.bca.securebluechat.bluetooth.BluetoothChatService

class ChatViewModel(application: Application) : AndroidViewModel(application) {

    val service = BluetoothChatService(application)

    override fun onCleared() {
        service.stop()
    }
}
