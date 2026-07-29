// lib/apiResponse.js — Standardised API responses
import { NextResponse } from 'next/server'

export function success(data, status = 200) {
    return NextResponse.json({ success: true, data }, { status })
}

export function created(data) {
    return success(data, 201)
}

export function error(message, status = 400, details = null) {
    return NextResponse.json(
        { success: false, error: message, ...(details && { details }) },
        { status }
    )
}

export function unauthorized(message = 'Unauthorized') {
    return error(message, 401)
}

export function forbidden(message = 'Forbidden') {
    return error(message, 403)
}

export function notFound(message = 'Not found') {
    return error(message, 404)
}

export function serverError(message = 'Internal server error') {
    console.error('[SERVER ERROR]', message)
    return error(message, 500)
}

export function validationError(errors) {
    return NextResponse.json(
        { success: false, error: 'Validation failed', details: errors },
        { status: 422 }
    )
}
