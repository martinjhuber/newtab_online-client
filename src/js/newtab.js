
import { config } from './config/config.js';
import { NewTabCommunication } from './newtabCommunication.js';
import { I18n } from './i18n.js';
import { Template } from './template.js';
import Cookies from '../resources/js.cookie.min.js'

const constants = {
    tileSize : 120,
    gutter : 10
};

class NewTabOnline {

    constructor(containerId) {
        this.containerId = containerId;
        this.commClient = new NewTabCommunication(config.serverUrl, config.tokenHeaderName);
        this.commClient.setToken(Cookies.get(config.tokenCookieName));
        this.user = null;
        this.isMenuOpen = false;
        this.editor = new NewTabOnlineEditor(this);

        I18n.setLang(Cookies.get(config.languageCookieName));
        Template.setI18n(I18n);
    }

    init() {

        Template.fillAndPersist('login', 'login-form');
        Template.fillAndPersist('userMenu', 'user-menu');
        Template.fill('language', 'language', { 'activeLang' : I18n.getLang() });
        Template.fillAndPersist('footer', 'footer', { 'year' : new Date().getFullYear() });
        Template.fillAndPersist('editBar', 'edit-bar');

        $("#user").click(() => this.changeMenuState());
        $("#loginButton").click(() => this.login());

        $("#editModeLink").click(() => { this.editor.setEditModeStatus(true); return false; });
        $("#addNewTileLink").click(() => { this.editor.startAddNewTile(); return false; });
        $("#editModeClose").click(() => { this.editor.setEditModeStatus(false); return false; });

        $("#logoutLink").click(() => { this.logout(); return false; });

        $("#modal").click((event) => { 
            if (event.target == document.getElementById("modal")) {
                this.editor.closeModal(); 
            }
        });

        $("#inputPassword").keypress((e) => {
            if (e.which == 13) {
                this.login();
            }
        });

        this.updateLanguageSwitchElement();

        $(window).resize(() => this.applyViewport());
        this.applyViewport();
    }

    /* Set up and navigation */

    applyViewport() {
        if (screen.width < 500) {
            $("#viewport").attr("content", "width=500");
        } else {
            $("#viewport").attr("content", "width=device-width, initial-scale=1");
        }
    }

    start() {
        let user = NewTabLocalStorage.getUser();
        if (user) {
            console.log("Taking user from cache");
            this.setUserState(user);
        } else {
            console.log("Loading user from server");
            this.getUserFromServer();
        }
    }

    changeMenuState() {
        if (this.isMenuOpen) {
            $("#userName").removeClass("userName-dark");
            $("#menuButton").css("filter", "invert(1)");
            $("#menu").css("display", "none");
            this.isMenuOpen = false;
        } else {
            $("#userName").addClass("userName-dark");
            $("#menuButton").css("filter", "invert(0.1)"); 
            $("#menu").css("display", "block");
            this.isMenuOpen = true;
        }
    }

    /* User state, login, logout */

    getUserFromServer() {
        if (this.commClient.hasToken()) {
            this.commClient.getUser((data) => this.setUserState(data), () => this.removeUserState());
        } else {
            this.removeUserState();
        }
    }
    
    login() {
        if ($("#loginButton").prop("disabled")) {
            return;
        }

        let name = $("#inputUsername").val();
        let password = $("#inputPassword").val();

        if (name && password && name.length > 0 && password.length > 0) {
            $("#loginButton").prop("disabled", true);
            this.commClient.login(
                name, 
                password,
                (data) =>  this.setUserState(data), 
                (errorObj) => this.commErrorHandler(errorObj, this.removeUserState)
            );
        }
    }

    logout() {
        this.commClient.logout(() => this.removeUserState());
    }

    setUserState(data) {
        $("#login").css("display", "none");
        $("#userMenu").css("display", "block");
        $("#userName").text(data.user.name);
        if (data.token) {
            Cookies.set(config.tokenCookieName, data.token, { expires: 10 * 365 });
            this.commClient.setToken(data.token);
        }
        this.user = data.user;
        NewTabLocalStorage.setUser(data);

        if (this.isMenuOpen) {
            this.changeMenuState();
        }

        this.loadGridDefinition();
    }

    removeUserState() {
        $("#login").css("display", "block");
        $("#loginButton").prop("disabled", false);
        $("#userMenu").css("display", "none");
        $("#userName").text("");
        Cookies.remove(config.tokenCookieName);
        this.commClient.setToken(null);
        this.user = null;
        NewTabLocalStorage.clear();
        // Show login if no user present
        if (!this.isMenuOpen) {
            this.changeMenuState();
        }
        Template.fill('gridContainer', 'logged-out-grid');
    }

    /* Error handling */

    commErrorHandler(errorObj, action) {
        this.showMessage(errorObj.error, true);

        if (errorObj.status == 401) {
            this.removeUserState();
        } else if (action) {
            action();
        }
    }

    /* User messages */

    showMessage(messageTextId, isError) {
        $("#messageFlap").addClass("messageFlap-slide");
        if (isError) {
            $("#message").text(I18n.get("error."+messageTextId));
            $("#message").addClass("errorMessage");
        } else {
            $("#message").text(I18n.get(messageTextId));
        }
        window.setTimeout(this.hideMessage, 4000);
    }

    hideMessage() {
        $("#message").text("");
        $("#messageFlap").removeClass("messageFlap-slide");
        $("#message").removeClass("errorMessage");
    }

    /* Grid definition methods */

    loadGridDefinition() {
        let gridDef = NewTabLocalStorage.getGridDefinition();
        if (gridDef) {
            console.log("Taking grid definition from cache");
            this.displayGrid(gridDef);
            this.commClient.getGridDefinitionVersion((data) => this.checkGridVersion(data.version), (errorObj) => this.commErrorHandler(errorObj));
        } else {
            this.retrieveGridDefinitionFromServer();
        }
    }

    checkGridVersion(serverVersion) {
        let version = NewTabLocalStorage.getVersion();
        if (version != serverVersion) {
            console.log("Old version. Refreshing grid definition from server");
            this.retrieveGridDefinitionFromServer();
        }
    }

    retrieveGridDefinitionFromServer(suppressMessage) {
        if (!suppressMessage) {
            this.showMessage("loading_grid");
        }
        console.log("Loading grid definition from server");
        this.commClient.getGridDefinition(
            (data) => {
                if (!suppressMessage) {
                    this.hideMessage();
                }
                NewTabLocalStorage.setGridDefinition(data);
                this.displayGrid(data);
            }, 
            null
        );
    }

    displayGrid(gridDefinition) {

        for(let grid of gridDefinition.grids) {
            grid.gridId = 'grid-'+grid.grid;

            for(let tile of grid.tiles) {
                tile.gridItemAddClass = '';
                if (tile.w > 1) {
                    tile.gridItemAddClass += ' grid-item-width'+tile.w;
                }
                if (tile.h > 1) {
                    tile.gridItemAddClass += ' grid-item-height'+tile.h;
                }

                let color = tile.color;
                if (!color) {
                    color = config.defaults.tileBackgroundColor;
                }

                tile.gradientStyle = Generators.gradientStyle(color);
                tile.borderStyle = Generators.borderStyle(color);

                tile.imageId = 'image-' + tile.tile;

                tile.textColor = Generators.determineTextColor(color);
            }
        }

        Template.fill('gridContainer', 'grid', gridDefinition);

        for(let grid of gridDefinition.grids) {
            for(let tile of grid.tiles) {
                if (tile.imageBase64) {
                    Generators.tileImageResize(tile.imageId, tile.w, tile.h, tile.imageScale);
                }
            }

            $('#'+grid.gridId).masonry({
                itemSelector: '.grid-item',
                columnWidth: constants.tileSize,
                gutter: constants.gutter
            });
        }
        
        if (this.editor.isEnabled) {
            this.editor.setEditModeStatus(true);
        }

    }

    /* Template support */

    refreshView() {
        Template.refreshPersistent();
        let gridDefinition = NewTabLocalStorage.getGridDefinition();
        if (this.user && gridDefinition) {
            this.displayGrid(gridDefinition);
        } else {
            Template.fill('gridContainer', 'logged-out-grid');
        }
    }

    /* Language switching */

    switchLanguage(language) {
        I18n.setLang(language);
        Cookies.set(config.languageCookieName, language, { expires: 10 * 365 });
        this.refreshView();
        this.updateLanguageSwitchElement();
    }

    updateLanguageSwitchElement() {
        Template.fill('language', 'language', { 'activeLang' : I18n.getLang() });
        $("#switchLanguage").click((event) => { this.switchLanguage($(event.target).data("lang")); return false; });
    }

}

class NewTabOnlineEditor {

    constructor(app) {
        this.app = app;
        this.isEnabled = false;
        this.editTile = null;
    }

    setEditModeStatus(isEnabled) {
        $('#editBar').css("display", isEnabled ? "block" : "none");
        this.isEnabled = isEnabled;

        if (isEnabled) {
            $(".grid-item").click((event) => {
                let tileId = $(event.target).closest("a").data("tileid");
                this.startEditTile(tileId);
                return false;
            });
            this.app.changeMenuState();
        } else {
            $(".grid-item").unbind('click');
            this.closeModal();
        }

        this.editTile = null;
    }

    startAddNewTile() {
        Template.fill('modalContent', 'new-tile-modal', null);

        $(".inputTileGrid").click(function(event) {
            $(".inputTileGrid").closest("label").removeClass("active");
            $(".inputTileGrid").attr("checked", false);
            $(event.target).closest("label").addClass("active");
            $(event.target).attr("checked", true);
        });
        $(".inputTileSize").click(function(event) {
            $(".inputTileSize").closest("label").removeClass("active");
            $(".inputTileSize").attr("checked", false);
            $(event.target).closest("label").addClass("active");
            $(event.target).attr("checked", true);
        });
        $("#saveModalButton").click(() => this.saveNewTile());
        $("#cancelModalButton").click(() => this.closeModal());
        $('#modal').css("display", "block");

        console.log("add tile");
    }

    getTileDefinition(tileId) {
        let grids = NewTabLocalStorage.getGridDefinition().grids;
        for(let gridId = 0; gridId < grids.length; gridId++) {
            let numTiles = grids[gridId].tiles.length;
            for (let tile of grids[gridId].tiles) {
                if (tile.tile == tileId) {
                    tile.grid = gridId;
                    tile.maxOrder = numTiles - 1;
                    return tile;
                }
            }
        }
        return null;
    }

    startEditTile(tileId) {

        let tile = this.getTileDefinition(tileId);
        if (tile == null) {
            console.error("Tile not found!", tileId);
            return;
        }

        let orderList = [];
        for (let i = 0; i <= tile.maxOrder; i++) {
            orderList[i] = { "id" : i, "number" : i + 1, "isCurrent" : (tile.order == i) };
        }

        let data = {
            "grid" : tile.grid,
            "orderList" : orderList,
            "tileSize" : ""+tile.w+"x"+tile.h
        };

        Template.fill('modalContent', 'edit-tile-modal', data);

        $(".inputTileGrid").click((event) => {
            this.sendMoveTile(tile.tile, parseInt($(event.target).data("gridid")));
        });

        $(".inputTileOrder").click((event) => {
            this.sendReorderTile(tile.tile, parseInt($(event.target).data("orderid")));
        });

        $("#inputTileText").val(tile.text);
        $("#inputTileUrl").val(tile.href);
        $("#inputTileColor").val(tile.color);
        $(".inputTileSize").click(function(event) {
            $(".inputTileSize").closest("label").removeClass("active");
            $(".inputTileSize").attr("checked", false);
            $(event.target).closest("label").addClass("active");
            $(event.target).attr("checked", true);
        });
        $('#inputTileImage').change(function() {
            $(this).next('.custom-file-label').html($(this).val());
        });
        $("#inputTileScale").val(tile.imageScale);

        $("#saveSettingsButton").click(() => this.saveTileSettings());

        $("#removeImageModalButton").click(() => this.startRemoveTileImage(tileId));
        $("#deleteModalButton").click(() => this.startDeleteTile(tileId));

        $("#cancelModalButton").click(() => this.closeModal());
        
        $('#modal').css("display", "block");
        this.editTile = tile;

        console.log("edit tileId:", tile.tile);
    }

    saveNewTile() {
        this.setInputDisabled(true);

        let text = $("#inputTileText").val();
        let href = $("#inputTileUrl").val();
        let color = $("#inputTileColor").val();
        if (color == "") {
            color = null;
        }
        let selectedTileSize = $('input[name=inputTileSize]:checked', '#modalContent').data("size");
        let selectedGridElement = $('input[name=inputTileGrid]:checked', '#modalContent').data("gridid");

        let w = selectedTileSize.charAt(0) == '2' ? 2 : 1;
        let h = selectedTileSize.charAt(2) == '2' ? 2 : 1;

        if (!this.verifyInput(text, href, color)) {
            return;
        }

        this.sendNewTile(text, href, color, w, h, selectedGridElement);
    }

    saveTileSettings() {
        this.setInputDisabled(true);

        let text = $("#inputTileText").val();
        let href = $("#inputTileUrl").val();
        let color = $("#inputTileColor").val();
        if (color == "") {
            color = null;
        }
        let selectedTileSize = $('input[name=inputTileSize]:checked', '#modalContent').data("size");
        let w = selectedTileSize.charAt(0) == '2' ? 2 : 1;
        let h = selectedTileSize.charAt(2) == '2' ? 2 : 1;

        let imageScale = $("#inputTileScale").val();
        if (imageScale < 1 || imageScale > 200) {
            imageScale = null;
        }

        if (!this.verifyInput(text, href, color)) {
            return;
        }

        let inputFileElem = $("#inputTileImage")[0];
        if (inputFileElem && inputFileElem.files && inputFileElem.files.length > 0) {
            let file = inputFileElem.files[0];
            let reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result.substring(0, 11) != "data:image/") {
                    this.showError("invalid_image");
                } else {
                    this.sendTileSettings(this.editTile.tile, text, href, color, w, h, reader.result, imageScale);
                }
            };
            reader.readAsDataURL(file);
        } else {
            this.sendTileSettings(this.editTile.tile, text, href, color, w, h, null, imageScale);
        }
    }

    startDeleteTile(tileId) {
        this.showConfirmDialog("confirm_delete_tile", () => this.sendDeleteTile(tileId));
    }

    startRemoveTileImage(tileId) {
        this.showConfirmDialog("confirm_remove_tile_image", () => this.sendRemoveTileImage(tileId));
    }

    sendNewTile(text, href, color, width, height, gridId) {
        if (text == null || text.length < 1 || href == null || href.length)

        this.app.commClient.createTile(
            text, href, color, width, height, gridId, 
            () => this.successCallback(), 
            (error) => this.errorCallback(error)
        );
    }

    sendMoveTile(tileId, gridId) {
        if (this.editTile.grid == gridId) {
            return;
        }

        this.setInputDisabled(true);
        
        this.app.commClient.moveTile(tileId, gridId, 
            () => this.successCallback(), 
            (error) => this.errorCallback(error)
        );
    }

    sendReorderTile(tileId, orderId) {
        if (this.editTile.order == orderId) {
            return;
        }
        
        this.setInputDisabled(true);

        this.app.commClient.reorderTile(tileId, orderId, 
            () => this.successCallback(), 
            (error) => this.errorCallback(error)
        );
    }

    sendDeleteTile(tileId) {
        this.setInputDisabled(true);

        this.app.commClient.deleteTile(tileId,  
            () => this.successCallback(), 
            (error) => this.errorCallback(error)
        );
    }

    sendRemoveTileImage(tileId) {
        this.setInputDisabled(true);

        this.app.commClient.removeTileImage(tileId,  
            () => this.successCallback(), 
            (error) => this.errorCallback(error)
        );
    }

    sendTileSettings(tileId, text, href, color, width, height, imageBase64, imageScale) {
        this.setInputDisabled(true);

        this.app.commClient.editTile(
            tileId, text, href, color, width, height, imageBase64, imageScale,
            () => this.successCallback(), 
            (error) => this.errorCallback(error)
        );
    }

    successCallback() {
        this.closeModal();
        this.app.retrieveGridDefinitionFromServer(true);
        this.app.showMessage("change_success");
    }

    errorCallback(error) {
        this.showError(error.error);
    }

    verifyInput(text, href, color) {
        if (text == null || text.length < 1) {
            this.showError("input_text_invald");
            return false;
        }
        if (href == null || href.length < 1) {
            this.showError("input_href_invald");
            return false;
        }
        if (color != null && !color.match(/^#[0-9abcdefABCDEF]{3,6}$/)) {
            this.showError("input_color_invald");
            return false;
        }
        return true;
    }

    setInputDisabled(isDisabled) {
        $("input,button", "#modalContent").prop('disabled', isDisabled);
    }

    closeModal() {
        $('#modal').css("display", "none");
        $('#modalContent').html("--");
    }

    showError(errorTextId) {
        this.setInputDisabled(false);
        $("#modalMessage").css("display", "block");
        $("#modalMessage").text(I18n.get("error."+errorTextId));
    }

    hideMessage() {
        $("#modalMessage").text("");
        $("#modalMessage").css("display", "none");
    }

    showConfirmDialog(messageTextId, yesFunction) {
        $("#confirm").css("display", "block");
        Template.fillAndPersist('confirmContent', 'confirm-modal');
        $("#confirmText").text(I18n.get(messageTextId));

        $("#yesActionButton").click(() => {
            yesFunction();
            $("#confirm").css("display", "none");
            return false;
        });
        $("#noActionButton").click(() => {
            $("#confirm").css("display", "none");
            return false;
        });
    }
}

let NewTabLocalStorage = {

    getUser : function () {
        let user = window.localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    },
    setUser : function (user) {
        window.localStorage.setItem("user", JSON.stringify(user));
    },

    getVersion : function () {
        let version = window.localStorage.getItem("version");
        return version ? parseInt(version) : null;
    },

    getGridDefinition : function () {
        let gridDef = window.localStorage.getItem("gridDefinition");
        return gridDef ? JSON.parse(gridDef) : null;
    },
    setGridDefinition : function (gridDef) {
        window.localStorage.setItem("version", gridDef.version);
        window.localStorage.setItem("gridDefinition", JSON.stringify(gridDef));
    },

    clear : function () {
        window.localStorage.removeItem("user");
        window.localStorage.removeItem("version");
        window.localStorage.removeItem("gridDefinition");
    }
};

let Generators = {

    gradientStyle : function (baseColor) {
        let darkerColor = pSBC(-0.35, baseColor);
        let lighterColor = pSBC(0.05, baseColor)
        let style = "background: "+baseColor+"; background: linear-gradient(90deg, "+darkerColor+" 0%, "+lighterColor+" 100%);";
        return style;
    },

    borderStyle : function (baseColor) {
        let lighterColor = pSBC(0.2, baseColor);
        let style = "border: 1px solid "+lighterColor+";";
        return style;
    },

    tileImageAdd : function (id, imageFile) {
        let html = '<img src="'+config.imageFolder+imageFile+'" border="0" alt="'+imageFile+'" class="tileImage" id="tileImage-'+id+'">';
        return html;    
    },

    tileImageResize : function (id, wFactor, hFactor, imageScale) {
        var img = new Image();
        img.onload = function() {
            let imageSize = config.defaults.imageBaseSize;
            if (imageScale) {
                imageSize = Math.floor(Math.min(config.defaults.imageBaseSize * imageScale / 100, constants.tileSize));
            }

            let maxHeight = hFactor * imageSize;
            let maxWidth = wFactor * imageSize;

            let hRel = img.height / maxHeight;
            let wRel = img.width / maxWidth;
            let relToApply = Math.max(hRel, wRel);

            let height = Math.floor(img.height / relToApply);
            let width = Math.floor(img.width / relToApply);
            let marginTop = Math.floor(height / 2);
            let marginLeft = Math.floor(width / 2);

            //console.log("ih", img.height, "iw", img.width, "maxH", maxHeight, "maxW", maxWidth, "hRel", hRel, "wRel", wRel, "height", height, "width", width);
            let imgElem = $('#'+id);
            imgElem.css('height', height+'px');
            imgElem.css('width', width+"px");
            imgElem.css('marginTop', '-'+marginTop+'px');
            imgElem.css('marginLeft', '-'+marginLeft+'px');
            imgElem.css('display', 'block');
        }
        img.src = $('#'+id).attr('src');
    },

    determineTextColor : function (baseColor) {
        let firstChar = baseColor.substring(0,1);
        if (firstChar !== '#') {
            return "tileText-white";
        }

        let r = 0, g = 0, b = 0;
        if (baseColor.length == 7) {
            r = parseInt(baseColor.substring(1,3), 16);  
            g = parseInt(baseColor.substring(3,5), 16);  
            b = parseInt(baseColor.substring(5,7), 16);
        } else if (baseColor.length == 4) {
            r = parseInt(baseColor.substring(1,2), 16);  
            g = parseInt(baseColor.substring(2,3), 16);  
            b = parseInt(baseColor.substring(3,7), 16);
            r = r * 16 + r;
            g = g * 16 + g;
            b = b * 16 + b;
        }

        let c = 0;
        let threshold = 192;
        if (r > threshold) ++c;
        if (g > threshold) ++c;
        if (b > threshold) ++c;

        if (c >= 2) {
            return "tileText-black";
        }

        return "tileText-white";
    },

    toDataUrl : function(id, url, callback) {


        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            var reader = new FileReader();
            reader.onloadend = function() {
                callback(id, reader.result);
            }
            reader.readAsDataURL(xhr.response);
        };
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.send();
    }
}

export { NewTabOnline };
