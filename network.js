"use strict";

async function XHRGET(url, params) {
    if (params) url += "?" + params.toString();
    
    let res = await fetch(url);
    CHECKHTTPRESPONSE(res);
    let status = res.status;
    res = await res.json();
    
    return APIRESPONSEPARSE(res, status);
}

async function XHRPOST(url, params, abortSignal) {
    let res = await fetch(url, {method: "POST", body: params, signal: abortSignal});
    CHECKHTTPRESPONSE(res);
    let status = res.status;
    res = await res.json();
    
    return APIRESPONSEPARSE(res, status);
}

async function XHRPOSTJSON(url, object) {
    object = JSON.stringify(object);
    
    let res = await fetch(url, {method: "POST", body: object, headers: {'Content-Type': 'application/json;charset=utf-8'}});
    CHECKHTTPRESPONSE(res);
    let status = res.status;
    res = await res.json();
    
    return APIRESPONSEPARSE(res, status);
}

async function APIRESPONSEPARSE(res, status) {
    if (!res.meta && res.hasOwnProperty("status")) {
        if (res.status == "OK") return res.payload;
        
        if (res.hasOwnProperty("code")) throw new ApiFailure(res.error, res.code);
        
        let error = new Error(`API call failed, returned ${res.status}. ${res.error}`, res);
        error.httpCode = status;
        throw error;
    } else if (!res.meta && !res.hasOwnProperty("status") && res.hasOwnProperty("okay")) {
        if (res.okay)
            return res;
        else
            throw new ApiFailure("API call failed, result was not 'okay'");
    }
        
    if (res.meta.status == "Success")
        return res.data;
    
    throw new ApiFailure("API call failed, returned " + res.meta.status, res.meta, status);
}

function CHECKHTTPRESPONSE(res) {
    if (res.ok) return
    switch(res.status) {
        case 400:
        case 403:
            break;
        default:
            throw new ApiNetworkError(res);
    }
}

class ApiNetworkError extends Error {
  constructor(res) {
    super(`${res.status} ${res.statusText}`);
    this.httpCode = res.status;
    this.httpCodeDesc = res.statusText;
  }
}

class ApiFailure extends Error {
    constructor(message, status) {
        super(message);
        this.httpCode = status;
    }
}

