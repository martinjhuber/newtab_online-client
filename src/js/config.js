let config = {
    serverUrl : 'http://localhost:57007/api/v1',
    tokenHeaderName : 'X-NTS-Token',
    tokenCookieName : 'NTS-Token',
    languageCookieName : 'NTC-Lang',
    defaults : {
        imageBaseSize : 110,    /* max size = 120 */
        tileBackgroundColor : '#FFF'
    }
};

export { config };