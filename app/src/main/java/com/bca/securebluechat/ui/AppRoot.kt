package com.bca.securebluechat.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import com.bca.securebluechat.ChatViewModel
import com.bca.securebluechat.bluetooth.ConnState

@Composable
fun AppRoot(viewModel: ChatViewModel) {
    val state by viewModel.service.state.collectAsState()
    var inChat by rememberSaveable { mutableStateOf(false) }
    var historyOnly by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(state) {
        when (state) {
            ConnState.NEEDS_PIN, ConnState.CHAT -> {
                inChat = true
                historyOnly = false
            }
            ConnState.IDLE -> if (!historyOnly) inChat = false
            else -> Unit
        }
    }

    if (inChat || historyOnly) {
        ChatScreen(
            viewModel = viewModel,
            readOnly = historyOnly,
            onBack = {
                inChat = false
                historyOnly = false
            }
        )
    } else {
        HomeScreen(
            viewModel = viewModel,
            onOpenHistory = {
                viewModel.service.openSavedChat()
                historyOnly = true
            }
        )
    }
}
