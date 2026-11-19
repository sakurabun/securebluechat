package com.bca.securebluechat.crypto

import android.util.Base64
import java.security.GeneralSecurityException
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * AES-256-GCM encryption with a PIN-derived key.
 *
 * How it works:
 *  1. Both phones enter the same PIN.
 *  2. A random 16-byte salt is created by the host phone and sent in the clear.
 *  3. PBKDF2-HmacSHA256 (120k iterations) turns (PIN + salt) into a 256-bit key.
 *  4. Every message is encrypted with AES-256-GCM using a fresh random 12-byte IV.
 *  5. IV + ciphertext + GCM auth tag are Base64 encoded and sent as one line.
 *
 * If the PINs don't match, decryption fails the GCM integrity check
 * (GeneralSecurityException) and the message is rejected.
 */
object CryptoManager {

    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val KEY_BITS = 256
    private const val IV_SIZE = 12
    private const val TAG_BITS = 128
    private const val PBKDF2_ITERATIONS = 120_000
    private const val SALT_SIZE = 16

    fun newSalt(): ByteArray =
        ByteArray(SALT_SIZE).also { SecureRandom().nextBytes(it) }

    fun deriveKey(pin: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(pin.toCharArray(), salt, PBKDF2_ITERATIONS, KEY_BITS)
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        return try {
            factory.generateSecret(spec).encoded
        } finally {
            spec.clearPassword()
        }
    }

    fun encrypt(plainText: String, key: ByteArray): String {
        val iv = ByteArray(IV_SIZE).also { SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(
            Cipher.ENCRYPT_MODE,
            SecretKeySpec(key, "AES"),
            GCMParameterSpec(TAG_BITS, iv)
        )
        val cipherText = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(iv + cipherText, Base64.NO_WRAP)
    }

    @Throws(GeneralSecurityException::class)
    fun decrypt(payload: String, key: ByteArray): String {
        val data = Base64.decode(payload, Base64.NO_WRAP)
        require(data.size > IV_SIZE) { "Payload too short" }
        val iv = data.copyOfRange(0, IV_SIZE)
        val cipherText = data.copyOfRange(IV_SIZE, data.size)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(
            Cipher.DECRYPT_MODE,
            SecretKeySpec(key, "AES"),
            GCMParameterSpec(TAG_BITS, iv)
        )
        return String(cipher.doFinal(cipherText), Charsets.UTF_8)
    }
}
