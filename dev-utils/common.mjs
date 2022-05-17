'use strict'
import fs from 'fs'
import jsonwebtoken from 'jsonwebtoken'
import axios from 'axios'
import https from 'https'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export function getPrivateKey(keyPath) {
    try {
        return fs.readFileSync(keyPath)
    } catch {
        return false;
    }
}

export function getJwt(immerDomain, privateKey, payload = {}, options = {}) {
    const defaultOptions = {
        algorithm: 'RS256',
        expiresIn: '1h',
        issuer: `https://${immerDomain}/o/immer`,
        audience: `https://${immerDomain}/o/immer`
    };
    const jwt = jsonwebtoken.sign(payload, privateKey, {
        ...defaultOptions,
        ...options
    })
    return jwt;
}

export function getHttpClient(sslRequired) {
    return axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: sslRequired
        })
    })
}

export function logErrors(e) {
    console.error('Error Code: ', e.code)
    if (e.response) {
        console.error(`Server response: ${e.response.status}: ${e.response.statusText}`);
        console.error(`Error message: ${e.response.data?.error}`);
        if (e.response.data?.error_description) {
            console.error(`Error description: ${e.response.data.error_description}`);
        }
    }
    if (e.code === 'ECONNREFUSED') {
        console.error('Is the Immers server running?')
    }
}

export function getYargs(args) {
    return yargs(hideBin(args))
}