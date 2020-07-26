
import { config } from './config.js';
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

        I18n.setLang(Cookies.get(config.languageCookieName));
        Template.setI18n(I18n);
    }

    init() {

        Template.fillAndPersist('login', 'login-form');
        Template.fillAndPersist('userMenu', 'user-menu');
        Template.fill('language', 'language', { 'activeLang' : I18n.getLang() });
        Template.fillAndPersist('footer', 'footer', { 'year' : new Date().getFullYear() });
        $("#user").click(this.changeMenuState);
        $("#loginButton").click(() => this.login());
        $("#logoutLink").click(() => { this.logout(); return false; });
        $("#inputPassword").keypress((e) => {
            if (e.which == 13) {
                this.login();
            }
        });
        this.updateLanguageSwitchElement();
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

    commErrorHandler(errorObj, action) {
        this.showMessage(errorObj.error, true);

        if (errorObj.status == 401) {
            this.removeUserState();
        } else if (action) {
            action();
        }
    }

    showMessage(message, isError) {
        $("#messageFlap").addClass("messageFlap-slide");
        if (isError) {
            $("#message").text(I18n.get("error."+errorCode));
            $("#message").addClass("errorMessage");
        } else {
            $("#message").text(I18n.get(message));
        }
        window.setTimeout(this.hideMessage, 4000);
    }

    hideMessage() {
        $("#messageFlap").removeClass("messageFlap-slide");
        $("#message").removeClass("errorMessage");
    }

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

    retrieveGridDefinitionFromServer() {
        this.showMessage("loading_grid");
        console.log("Loading grid definition from server");
        this.commClient.getGridDefinition(
            (data) => {
                this.hideMessage();
                NewTabLocalStorage.setGridDefinition(data);
                this.displayGrid(data);
            }, 
            null
        );
    }

    displayGrid(gridDefinition) {

        for(let grid of gridDefinition.grids) {
            grid.gridId = 'grid-'+grid.grid;

            let index = 0;
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

                tile.imageId = grid.gridId + '-image-' + tile.tile;

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
        
    }

    refreshView() {
        Template.refreshPersistent();
        let gridDefinition = NewTabLocalStorage.getGridDefinition();
        if (this.user && gridDefinition) {
            this.displayGrid(gridDefinition);
        } else {
            Template.fill('gridContainer', 'logged-out-grid');
        }
    }

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
        NewTabLocalStorage.removeItem("user");
        NewTabLocalStorage.removeItem("version");
        NewTabLocalStorage.removeItem("gridDefinition");
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
    }
}

export { NewTabOnline };
