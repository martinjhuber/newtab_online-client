
const translations = {
    'en' : {
        'login' : 'Login',
        'logout' : 'Logout',
        'edit_mode' : 'Open edit mode',
        'user_name' : 'User name',
        'password' : 'Password',
        'language' : 'Language',
        'by' : 'by',
        'github' : 'source code on GitHub',
        'please_login' : 'Please log in to see your new tab grid.',
        'loading_grid' : 'Updating grid...',
        'select_tile_to_edit' : '<b>Edit mode active.</b> Select a tile to edit it or',
        'add_new_tile' : 'add a new tile',
        'add_tile_title' : 'Add new tile',
        'edit_tile_title' : 'Edit tile',
        'move_title' : 'Move tile to another column',
        'reorder_title' : 'Reorder tile within column',
        'basic_settings_title' : 'Basic settings',
        'image_settings_title' : 'Image options',
        'select_image' : 'Select an image for the tile',
        'tile_imageScale' : 'Scale factor of the image (in percent, default: 100)',
        'close_edit_mode' : 'Close edit mode.',
        'save' : 'Save',
        'add' : 'Add',
        'cancel' : 'Cancel',
        'delete' : 'Delete',
        'remove_image' : 'Remove image',
        'tile_grid' : 'Column number (from left to right)',
        'tile_text' : 'Link text',
        'tile_url' : 'Link URL',
        'tile_color' : 'Color',
        'tile_size' : 'Tile size',
        '1x1' : '1 x 1',
        '1x2' : '1 x 2 (high)',
        '2x1' : '2 x 1 (wide)',
        '2x2' : '2 x 2',
        'change_success' : 'Changes successfully applied.',
        'error.input_text_invald' : 'Link text must not be empty.',
        'error.input_href_invald' : 'Link URL must not be empty.',
        'error.input_color_invald' : 'Color must be of format \'#XXX\' or \'#XXXXXX\' where X is a hex number (e.g. #FA0096)',
        'error.no_db_connection' : 'Server failed to connect to DB. Please try again later.',
        'error.user_unknown' : 'Unknown user. Please check user name and password.',
        'error.token_invalid' : 'Session expired. Please log in again.',
        'error.body_structure_error' : 'Application error #101.',
        'error.missing_parameter' : 'Application error #102.',
        'error.invalid_string' : 'Application error #103.',
        'error.invalid_integer' : 'Application error #104.',
        'error.tile_not_found' : 'Tile already deleted.',
        'error.tile_create_failed' : 'Tile creation failed.',
        'error.tile_edit_failed' : 'Tile edit failed.',
        'error.invalid_image' : 'Image format incorrect. Please try another image.'
    },
    'de' : {
        'login' : 'Einloggen',
        'logout' : 'Ausloggen',
        'edit_mode' : 'Öffne Editiermodus',
        'user_name' : 'Benutzername',
        'password' : 'Passwort',
        'language' : 'Sprache',
        'by' : 'von',
        'github' : 'Source Code auf GitHub',
        'please_login' : 'Bitte loggen sie sich ein, um ihr \'new tab\' Raster zu sehen.',
        'loading_grid' : 'Lade aktuelles Raster...',
        'select_tile_to_edit' : '<b>Editiermodus aktiv.</b> Wählen Sie ein Element, um es zu editieren, oder',
        'add_new_tile' : 'füge ein neues hinzu',
        'add_tile_title' : 'Neues Element',
        'edit_tile_title' : 'Element editieren',
        'move_title' : 'Element in andere Spalte bewegen',
        'reorder_title' : 'Position in Spalte ändern',
        'basic_settings_title' : 'Grundeinstellungen',
        'image_settings_title' : 'Bildeinstellungen',
        'select_image' : 'Wähle ein Bild für das Element',
        'tile_imageScale' : 'Skalierungsfaktor für das Bild (in Prozent, Standardwert: 100)',
        'close_edit_mode' : 'Editiermodus schließen.',
        'save' : 'Speichern',
        'add' : 'Hinzufügen',
        'cancel' : 'Abbrechen',
        'delete' : 'Löschen',
        'remove_image' : 'Bild entfernen',
        'tile_grid' : 'Spalte (von links nach rechts)',
        'tile_text' : 'Link-Text',
        'tile_url' : 'Link-URL',
        'tile_color' : 'Farbe',
        'tile_size' : 'Größe',
        '1x1' : '1 x 1',
        '1x2' : '1 x 2 (hoch)',
        '2x1' : '2 x 1 (breit)',
        '2x2' : '2 x 2',
        'change_success' : 'Änderungen erfolgreich gespeichert.',
        'error.input_text_invald' : 'Link-Text muss ausgefüllt sein.',
        'error.input_href_invald' : 'Link-URL muss ausgefüllt sein.',
        'error.input_color_invald' : 'Farbe muss im Format \'#XXX\' oder \'#XXXXXX\' gespeichert werden, wobei X Hexzahlen sind (z.B. #FA0096)',
        'error.no_db_connection' : 'Serververbindung mit der Datenback fehlgeschlagen. Bitte versuchen sie es später nochmal.',
        'error.user_unknown' : 'Unbekannter Benutzer. Bitte prüfen sie ihren Benutzernamen und Passwort.',
        'error.token_invalid' : 'Sitzung abgelaufen. Bitte erneut einloggen.',
        'error.tile_not_found' : 'Element wurde bereits entfernt.',
        'error.tile_create_failed' : 'Anlegen fehlgeschlagen.',
        'error.tile_edit_failed' : 'Editieren fehlgeschlagen.',
        'error.invalid_image' : 'Bildformat inkorrekt. Bitte versuchen sie es mit einem anderen Bild.'
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
