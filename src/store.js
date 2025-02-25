const ud = _userdata;

export const store = {
    user: {
        name: ud.username,
        logged_in: ud.session_logged_in,
        level: ud.user_level,
        id: ud.user_id,
        posts: ud.user_posts,
        avatar: ud.avatar,
        avatar_link: ud.avatar_link,
        group_color: ud.groupcolor,
    },
};
