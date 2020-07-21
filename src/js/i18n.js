
const translations = {
    'en' : {
        'login' : 'Login',
        'user_name' : 'User name',
        'password' : 'Password',
        'language' : 'Language',
        'by' : 'by',
        'github' : 'source code on GitHub',
        'please_login' : 'Please log in to see your new tab grid.',
        'error.no_db_connection' : 'Server failed to connect to DB. Please try again later.',
        'error.user_unknown' : 'Unknown user. Please check user name and password.',
        'error.token_invalid' : 'Session expired. Please log in again.',
        'error.body_structure_error' : 'Application error #101.',
        'error.missing_parameter' : 'Application error #102.',
        'error.invalid_string' : 'Application error #103.',
        'error.invalid_integer' : 'Application error #104.'
    },
    'de' : {
        'login' : 'Einloggen',
        'user_name' : 'Benutzername',
        'password' : 'Passwort',
        'language' : 'Sprache',
        'by' : 'von',
        'github' : 'Source Code auf GitHub',
        'please_login' : 'Bitte loggen sie sich ein, um ihr \'new tab\' Raster zu sehen.',
        'error.no_db_connection' : 'Serververbindung mit der Datenback fehlgeschlagen. Bitte versuchen sie es später nochmal.',
        'error.user_unknown' : 'Unbekannter Benutzer. Bitte prüfen sie ihren Benutzernamen und Passwort.',
        'error.token_invalid' : 'Sitzung abgelaufen. Bitte erneut einloggen.'
    }
};

class I18nImpl {

    constructor() {
        this.lang = 'en';
    }

    setLang(lang) {
        if (lang && translations[lang]) {
            this.lang = lang;
        }
    }

    getLang() {
        return this.lang;
    }

    get(id) {
        if (translations[this.lang] && translations[this.lang][id]) {
            return translations[this.lang][id];
        }
        if (translations['en'][id]) {   // fallback to English
            return translations['en'][id];
        }
        return "###TRANSLATION_MISSING###:" + id;
    }

}

let I18n = new I18nImpl();

export { I18n };
