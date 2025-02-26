const ud = _userdata;

/**
 * @module store
 * @description Objet global servant de store.
 */
export const store = {
    user: {
        name: ud.username,
        logged_in: Boolean(ud.session_logged_in),
        level: ud.user_level,
        id: ud.user_id,
        posts: ud.user_posts,
        avatar: ud.avatar,
        avatar_link: ud.avatar_link,
        group_color: ud.groupcolor,
    },
};

export const extendStore = (data) => {
    return Object.assign({ $store: store }, data);
};
