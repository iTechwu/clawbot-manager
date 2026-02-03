/**
 * User Error Codes (2xx prefix)
 * 用户相关错误码
 */

// User Error Code Constants (string enum)
export const UserErrorCode = {
  OauthAccountAlreadyExist: '200409',
  UserNotFound: '200401',
  UserAlreadyExists: '200402',
  InvalidPassword: '200403',
  InvalidVerifyCode: '200400',
  WriteAccessTokenFail: '200500',
  SsoHostNameError: '200501',
  OauthTokenInvalid: '206407',
  NicknameIsTooLong: '207400',
  NicknameIsTooShort: '208400',
  EmailIsInvalid: '209400',
} as const;

export type UserErrorCode = (typeof UserErrorCode)[keyof typeof UserErrorCode];

// User Error Type Keys (for i18n)
export const UserErrorTypes: Record<UserErrorCode, string> = {
  [UserErrorCode.OauthAccountAlreadyExist]: 'oauthAccountAlreadyExist',
  [UserErrorCode.UserNotFound]: 'userNotFound',
  [UserErrorCode.UserAlreadyExists]: 'userAlreadyExists',
  [UserErrorCode.InvalidPassword]: 'invalidPassword',
  [UserErrorCode.InvalidVerifyCode]: 'invalidVerifyCode',
  [UserErrorCode.WriteAccessTokenFail]: 'writeAccessTokenFail',
  [UserErrorCode.SsoHostNameError]: 'ssoHostNameError',
  [UserErrorCode.OauthTokenInvalid]: 'oauthTokenInvalid',
  [UserErrorCode.NicknameIsTooLong]: 'nicknameIsTooLong',
  [UserErrorCode.NicknameIsTooShort]: 'nicknameIsTooShort',
  [UserErrorCode.EmailIsInvalid]: 'emailIsInvalid',
};

// User Error HTTP Status mapping
export const UserErrorHttpStatus: Record<UserErrorCode, number> = {
  [UserErrorCode.OauthAccountAlreadyExist]: 422,
  [UserErrorCode.UserNotFound]: 401,
  [UserErrorCode.UserAlreadyExists]: 200,
  [UserErrorCode.InvalidPassword]: 401,
  [UserErrorCode.InvalidVerifyCode]: 200,
  [UserErrorCode.WriteAccessTokenFail]: 200,
  [UserErrorCode.SsoHostNameError]: 200,
  [UserErrorCode.OauthTokenInvalid]: 401,
  [UserErrorCode.NicknameIsTooLong]: 200,
  [UserErrorCode.NicknameIsTooShort]: 200,
  [UserErrorCode.EmailIsInvalid]: 200,
};
