const ud =
    typeof window !== "undefined" && typeof window._userdata !== "undefined"
        ? window._userdata
        : {};

/**
 * @module store
 * @description Objet global servant de store.
 */
export const store = {
    user: {
        name: ud.username || null,
        logged_in: Boolean(ud.session_logged_in || null),
        level: ud.user_level || null,
        id: ud.user_id || null,
        posts: ud.user_posts || 0,
        avatar: ud.avatar || null,
        avatar_link: ud.avatar_link || null,
        group_color: ud.groupcolor || null,
    },
};

export const extendStore = (data) => {
    return Object.assign({ $store: store }, data);
};
