
class NewTabCommunication {

    constructor(baseUrl, tokenHeaderName) {
        this.client = new Client(baseUrl, tokenHeaderName);
    }

    setToken(token) {
        this.client.token = token;
    }

    hasToken() {
        return (this.client.token) ? true : false;
    }

    getUser(successCallback, errorCallback) {
        this.client.get("/user", successCallback, errorCallback);
    }

    login(name, password, successCallback, errorCallback) {
        this.client.post("/user/login", { name : name, password : password }, successCallback, errorCallback);
    }

    logout(callback) {
        this.client.post("/user/logout", null, callback, callback);
    }

    getGridDefinition(successCallback, errorCallback) {
        this.client.get("/grid", successCallback, errorCallback);
    }

    getGridDefinitionVersion(successCallback, errorCallback) {
        this.client.get("/grid/version", successCallback, errorCallback);
    }

    createTile(text, href, color, width, height, gridId, successCallback, errorCallback) {
        let data = {
            gridId : gridId,
            text : text,
            href : href,
            color : color,
            w : width,
            h : height
        };
        this.client.post("/grid/tile", data, successCallback, errorCallback);
    }

    editTile(tileId, text, href, color, width, height, imageBase64, imageScale, successCallback, errorCallback) {
        let data = {
            text : text,
            href : href,
            color : color,
            w : width,
            h : height,
            imageBase64 : imageBase64,
            imageScale : imageScale
        };
        this.client.put("/grid/tile/"+tileId, data, successCallback, errorCallback);
    }

    deleteTile(tileId, successCallback, errorCallback) {
        this.client.delete("/grid/tile/"+tileId, null, successCallback, errorCallback);
    }

    removeTileImage(tileId, successCallback, errorCallback) {
        this.client.delete("/grid/tile/"+tileId+"/image", null, successCallback, errorCallback);
    }

    moveTile(tileId, gridId, successCallback, errorCallback) {
        let data = {
            gridId : gridId
        };
        this.client.put("/grid/tile/"+tileId+"/gridId", data, successCallback, errorCallback);
    }

    reorderTile(tileId, orderId, successCallback, errorCallback) {
        let data = {
            order : orderId
        };
        this.client.put("/grid/tile/"+tileId+"/order", data, successCallback, errorCallback);
    }
}

class Client {

    constructor(baseUrl, tokenHeaderName) {
        this.baseUrl = baseUrl;
        this.tokenHeaderName = tokenHeaderName;
        this.token = null;
    }

    get (apiPath, successFunction, errorFunction) {
        this.ajax("GET", apiPath, null, successFunction, errorFunction);
    }

    post (apiPath, data, successFunction, errorFunction) {
        this.ajax("POST", apiPath, data, successFunction, errorFunction);
    }

    put (apiPath, data, successFunction, errorFunction) {
        this.ajax("PUT", apiPath, data, successFunction, errorFunction);
    }

    delete (apiPath, data, successFunction, errorFunction) {
        this.ajax("DELETE", apiPath, data, successFunction, errorFunction);
    }

    // callbacks called with:
    // success function: successFunction(returnedData);
    // error function: errorFunction(CommunicationError error);
    ajax (type, apiPath, data, successFunction, errorFunction) {
        console.log("AJAX", type, this.baseUrl + apiPath, this.token, data);

        let request = {
            type: type,
            url: this.baseUrl + apiPath,
            headers : {
                'X-NTS-Token' : this.token ? this.token : ""
            },
            data: data ? JSON.stringify(data) : "",
            success: function (returnedData) { 
                console.log("AJAX result", returnedData);
                successFunction(returnedData); 
            },
            error: this._errorHandler(errorFunction),
            dataType: "json",
            contentType: "application/json"
        };

        if (this.token) {
            request.headers = {};
            request.headers[this.tokenHeaderName] = this.token;
        }

        $.ajax(request);
    }

    _errorHandler (cb) {
        return (xhr) => {
            let json = JSON.parse(xhr.responseText);
            let error = new CommunicationError(xhr.status, json.error, json.details);
            console.error(error);
            if (cb) {
                //this.preErrorHandler(error);
                cb(error);
            }
        }
    }

}

class CommunicationError {
    constructor(status, error, details) {
        this.status = status;
        this.error = error;
        this.details = details;
    }
}

export { NewTabCommunication, CommunicationError };