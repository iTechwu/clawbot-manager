/**
 * Error Messages
 * 错误消息映射
 *
 * Default English messages for all error types.
 * These are used as fallback when i18n is not available.
 */

/**
 * Error messages by domain and error type
 * 按域和错误类型分组的错误消息
 */
export const ErrorMessages: Record<string, Record<string, string>> = {
  user: {
    oauthAccountAlreadyExist: 'OAuth Account Already Exists',
    userNotFound: 'User Not Found',
    userAlreadyExists: 'User Already Exists',
    invalidPassword: 'Invalid Password',
    invalidVerifyCode: 'Invalid Verification Code',
    writeAccessTokenFail: 'Failed to write access token',
    ssoHostNameError: 'Invalid SSO hostname error',
    oauthTokenInvalid: 'OAuth Token Invalid',
    nicknameIsTooLong: 'Nickname is too long',
    nicknameIsTooShort: 'Nickname is too short',
    emailIsInvalid: 'Email is invalid',
  },
  space: {
    spaceConfigIsNotSet: 'Space config is not set',
    storageIsFull: 'Storage Full',
    trafficIsFull: 'Insufficient Transfer Capacity',
    bucketIsNotExist: 'Bucket Not Found',
    invalidSpaceId: 'Invalid spaceId',
    spaceIsNotExist: 'Space Not Found or Deleted',
    spaceIsDeleted:
      "Oops, you're too late, the resource has already been deleted.",
    spaceIsExpired: 'Space Expired',
    spaceIsFreeze: 'The space has been frozen and cannot be operated on',
    inviteIsNotExist: 'Invite does not exist',
    inviteIsExpired: 'Invite Expired',
    inviteIsUsed: 'Invite Used',
    hasInvited: 'User is already in the collaboration list',
    spaceCreateNoPermission: 'You do not have permission to create a space',
    spaceNotPermission: 'No Permission for Space',
    spaceOverMax: 'The current version supports creating up to 2 projects.',
    spaceHasFileUploading: 'File Uploading in Space, Cannot Delete',
    haveNoSpaceForLaunch: 'No available space to launch',
    spaceNameIsTooShort: 'Space name is too short',
    spaceNameIsTooLong: 'Space name is too long',
    spaceCollaborationOverMax:
      'The number of collaborators in this space has exceeded the maximum limit',
  },
  folder: {
    folderIsNotExist: 'Folder Not Found',
    folderIsDeleted:
      "Oops, you're too late, the resource has already been deleted.",
    folderStructIsNotExist: 'Invalid Folder Structure',
    folderHasFileUploading: 'Folder Has File Uploading, Cannot Delete',
    folderNameIsExist: 'Folder Name Already Exists',
    folderNameIsTooLong: 'Folder name is too long',
    folderNameIsTooShort: 'Folder name is too short',
    folderNotPermission: 'Insufficient Permission for Folder',
    folderMoveCannotSelf: 'Cannot move the folder to itself',
    folderMoveCannotSelfChild: 'Cannot move the folder to its own subdirectory',
    cannotTransferSaveToParent:
      'Cannot transfer or save to its own or its subdirectory',
  },
  file: {
    fileSizeTooLarge: 'File Size Too Large',
    fileIsNotExist: 'File Not Found',
    fileIsNotVideo: 'The file is not a video',
    fileIsDeleted: "Oops, you're too late, the file has already been deleted.",
    fileIsNotUploaded: 'File has not been uploaded yet',
    fileIsFreeze: 'The file has been frozen and cannot be operated on',
    fileNameIsExist: 'File Name Already Exists',
    fileNameIsTooLong: 'File name is too long',
    fileNameIsTooShort: 'File name is too short',
    fileDeleteButIsNotInTrash: 'Cannot Delete File Not in Trash',
    deleteNoneFileOrFolder: 'No File or Folder to Delete',
    batchDeleteFilesFail: 'Batch Deletion of Files Failed',
    signalDeleteFileFail: 'File Deletion Failed',
    fileNotPermission: 'Insufficient Permission for File',
    fileReviewIsNotSupportForFolder: 'File Review is not supported for folder',
    audioTranscribeTaskNotFound: 'Audio transcribe task not found',
    taskNotFound: 'Task Not Found',
    failedToCloneTranscodeTask: 'Failed to Clone Transcode Task',
    failedToRestartTranscodeTask: 'Failed to Restart Transcode Task',
    failedToAbortTranscodeTask: 'Failed to Abort Transcode Task',
    failedToGetTranscodeTask: 'Failed to Get Transcode Task',
    failedToCreateTranscodeTask: 'Failed to Create Transcode Task',
    failedToProcessSnapshotTask: 'Failed to Process Snapshot Task',
    failedToProcessVideoSpriteTask: 'Failed to Process Video Sprite Task',
    videoInfoIsNotExist: 'Video Info Does Not Exist',
    invalidTemplateType: 'Invalid Template Type',
  },
  payment: {
    invalidStripeEventType: 'Invalid Stripe Event Type',
    stripeWebhookError: 'Stripe Webhook Error',
    stripeCardError: "Your card's expiration year is invalid",
    stripeRateLimitError:
      'Too many requests have been made to the API too quickly',
    stripeInvalidRequestError:
      "Invalid parameters were supplied to Stripe's API",
    stripeAPIError: "An error occurred internally with Stripe's API",
    stripeConnectionError:
      'Some kind of error occurred during the HTTPS communication',
    stripeAuthenticationError: "You probably didn't set your API key",
    stripeUnexpectedErrors: 'Something bad happened',
    fetchProductDetailsFailed: 'Failed to fetch product details',
    confirmOrderFailed: 'Confirmation of order failed',
    submitOrderFailed: 'Failed to submit order',
    insufficientBalance:
      'Insufficient balance, please cancel the recharge deduction and then place the order',
    getTradeDetailFailed: 'Failed to get trade detail',
    getTradeListFailed: 'Failed to get trade list',
    getPayListFailed: 'Failed to get pay list',
    generateTradeLinkFailed: 'Failed to generate trade link',
    paySingleTradeFailed: 'Failed to pay single trade',
    cancelTradeFailed: 'Failed to cancel trade',
    getTradeNumbersFailed: 'Failed to get trade numbers',
    fixOrderFailed: 'Failed to fix order',
    refundFixOrderFailed: 'Failed to refund and fix order',
    getRefundableAndRefundedOrdersFailed:
      'Failed to get refundable and refunded orders',
    getSubOrderListFailed: 'Failed to get sub order list',
    refundOrderFailed: 'Failed to refund order',
    orderAlreadyRefunded:
      'Order has already been refunded, please do not repeat the operation',
    refundSubOrderFailed: 'Failed to refund sub order',
    subOrderAlreadyRefunded:
      'Sub order has already been refunded, please do not repeat the operation',
    checkPurchaseHistoryFailed: 'Failed to check purchase history',
    getCartListFailed: 'Failed to get cart list',
    addProductToCartFailed: 'Failed to add product to cart',
    updateProductQuantityInCartFailed:
      'Failed to update product quantity in cart',
    selectCartItemsFailed: 'Failed to select cart items',
    removeCartItemsFailed: 'Failed to remove items from cart',
    usePromotionFailed: 'Failed to apply promotion to cart item',
    createTicketTemplateFailed: 'Failed to create ticket template',
    updateTicketTemplateFailed: 'Failed to update ticket template',
    getTicketTemplateDetailsFailed: 'Failed to get ticket template details',
    getTicketTemplateListFailed: 'Failed to get ticket template list',
    distributeTicketFailed: 'Failed to distribute ticket',
    deleteUserTicketFailed: 'Failed to delete user ticket',
    getUserTicketListFailed: 'Failed to get user ticket list',
    getUserTicketDetailFailed: 'Failed to get user ticket details',
    getUserTicketOrderListFailed: 'Failed to get user ticket order list',
    updateUserTicketFailed: 'Failed to update user ticket',
  },
  common: {
    idMustUUID: 'ID must be a valid UUID format',
    innerError: 'Internal Parameter Error',
    internalServerError: 'Internal Server Error',
    badRequest: 'Bad Request',
    unknown: 'Unknown Error',
    getStorageNull: 'User Storage Content Not Found',
    dbCreateError: 'Database Creation Failed',
    dbUpdateError: 'Database Update Failed',
    dbDeleteError: 'Database Delete Failed',
    dbQueryError: 'Database Query Failed',
    templateNotFound: 'Template Not Found',
    invalidParameters: 'Invalid Parameters',
    signatureError: 'Signature Error',
    tooManyFolders: 'Too Many Folders',
    tooManyFiles: 'Too Many Files',
    notFound: 'Resource Not Found',
    planIsNotExist: 'Plan does not exist',
    planIsDeleted: 'Plan has been deleted',
    recommendPlanNotFound: 'Coming Soon',
    createOrderFail: 'Failed to create order',
    orderIsNotExist: 'Order does not exist',
    systemUnHealthy: 'System unhealthy',
    parameterError: 'Parameter Error',
    getProviderUserInfoError: 'Failed to Retrieve User Information',
    rabbitmqQueueIsNotExist: 'MQ Queue Not Found',
    storageResponseFailed: 'Failed to Access Storage',
    batchDeleteFolderFail: 'Failed to Batch Delete Folders',
    initiateMultipartUploadError: 'Initiate Multipart Upload Error',
    qrcodeGenerateError: 'QR Code Generation Error',
    fileServiceUnsupportedVendor: 'Unsupported File Service Vendor',
    qiniuZipDownloadError: 'Qiniu Zip Download Error',
    qiniuQueryFopStatusError: 'Qiniu Query FOP Status Error',
    qiniuUploaderError: 'Qiniu Uploader Error',
    s3NoSuchKey: 'No Such Key in bucket',
    s3NoSuchBucket: 'No Such Bucket',
    unAuthorized: 'Unauthorized',
    unauthorizedByKey: 'Unauthorized by Key',
    tooFrequent: 'Too Many Requests, Please Try Again Later',
    invalidToken: 'Invalid Token',
    invalidEnv: 'Invalid Env Config',
    invalidRedis: 'Invalid Redis',
    textCensorValidFailed: 'Text censor validation failed',
    featureAlreadyExists: 'Feature name already exists',
    featureNotFound: 'Feature not found',
    featureHasPermissions: 'Feature has associated permissions, cannot delete',
    someFeaturesHavePermissions:
      'Some features have associated permissions, cannot delete',
    wechatAccessTokenError: 'Wechat access token error',
    wechatMiniProgramQRCodeError: 'Failed to get mini program QR code',
    llmJinaAiEmbeddingError: 'Jina AI embedding API call failed',
    llmJinaAiRerankError: 'Jina AI rerank API call failed',
    llmJinaAiReadError: 'Jina AI read API call failed',
    llmJinaAiSearchError: 'Jina AI search API call failed',
    llmJinaAiClassifyError: 'Jina AI classify API call failed',
    llmJinaAiSegmentError: 'Jina AI segment API call failed',
    llmJinaAiGRelatedError: 'Jina AI related content API call failed',
    llmJinaAiDeepsearchError: 'Jina AI deep search API call failed',
    s3ClientInitializationError: 'S3 Client Initialization Failed',
    invalidVideoUri: 'Invalid video URI format, must be in s3:// format',
    invalidTaskId: 'Task ID cannot be empty',
    missingVendor: 'Either vendor or videoUri must be provided',
  },
};

/**
 * Flattened error messages lookup (errorType -> message)
 * 扁平化的错误消息查找表 (errorType -> message)
 */
export const AllErrorMessages: Record<string, string> = Object.entries(
  ErrorMessages,
).reduce(
  (acc, [, messages]) => {
    Object.entries(messages).forEach(([errorType, message]) => {
      acc[errorType] = message;
    });
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Get error message by error type
 * 根据错误类型获取错误消息
 *
 * @param errorType - The error type string (e.g., 'userNotFound')
 * @returns The error message or the error type itself if not found
 */
export function getErrorMessage(errorType: string): string {
  return AllErrorMessages[errorType] || errorType;
}
