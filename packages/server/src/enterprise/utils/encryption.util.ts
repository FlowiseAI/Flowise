import bcrypt from 'bcryptjs'
import { AES, enc } from 'crypto-js'
import { getEncryptionKey } from '../../utils'

export function getHash(value: string) {
    const salt = bcrypt.genSaltSync(parseInt(process.env.PASSWORD_SALT_HASH_ROUNDS || '5'))
    return bcrypt.hashSync(value, salt)
}

export function compareHash(value1: string, value2: string) {
    return bcrypt.compareSync(value1, value2)
}

export async function encrypt(value: string) {
    const encryptionKey = await getEncryptionKey()
    return AES.encrypt(value, encryptionKey).toString()
}

export async function decrypt(value: string) {
    const encryptionKey = await getEncryptionKey()
    return AES.decrypt(value, encryptionKey).toString(enc.Utf8)
}
