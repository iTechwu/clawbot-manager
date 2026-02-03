// 获取上传签名URL请求
export type GetUploadUrlRequest = {
    object_name: string
    content_type?: string
    expires_minutes?: number
}

// 获取上传签名URL响应
export type GetUploadUrlResponse = {
    upload_url: string
    object_name: string
    expires_in: number
}