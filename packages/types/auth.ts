

export type TikTokAccessToken = {
    access_token: string;
    expires_in: number;
    open_id: string;
    refresh_expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string;
}

export type TikTokUserProfile = {
    /**
     * The unique identification of the user in the current application. Open id for the client.
     * Source: user.info.basic
     */
    open_id: string;

    /**
     * The unique identification of the user across different apps for the same developer.
     * For example, if a partner has X number of clients, it will get X number of open_id for the same TikTok user,
     * but one persistent union_id for the particular user.
     * Source: user.info.basic
     */
    union_id: string;

    /**
     * User's profile image.
     * Source: user.info.basic
     */
    avatar_url: string;

    /**
     * User's profile image in 100x100 size.
     * Source: user.info.basic
     */
    avatar_url_100: string;

    /**
     * User's profile image with higher resolution.
     * Source: user.info.basic
     */
    avatar_large_url: string;

    /**
     * User's profile name.
     * Source: user.info.basic
     */
    display_name: string;

    /**
     * User's bio description, if there is a valid one.
     * Source: user.info.profile
     */
    bio_description: string;

    /**
     * The link to user's TikTok profile page.
     * Source: user.info.profile
     */
    profile_deep_link: string;

    /**
     * Whether TikTok has provided a verified badge to the account after confirming that it belongs to the user it represents.
     * Source: user.info.profile
     */
    is_verified: boolean;

    /**
     * User's username.
     * Source: user.info.profile
     */
    username: string;

    /**
     * User's followers count.
     * Source: user.info.stats
     */
    follower_count: number;

    /**
     * The number of accounts that the user is following.
     * Source: user.info.stats
     */
    following_count: number;

    /**
     * The total number of likes received by the user across all of their videos.
     * Source: user.info.stats
     */
    likes_count: number;

    /**
     * The total number of videos posted by the user.
     * Source: user.info.stats
     */
    video_count: number;
}