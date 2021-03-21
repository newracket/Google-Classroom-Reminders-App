const AppAuth = require("@openid/appauth/built");
const NodeSupport = require("@openid/appauth/built/node_support/");
const fs = require("fs");
const path = require("path");

const requestor = new NodeSupport.NodeRequestor();
/* an example open id connect provider */
const openIdConnectUrl = "https://accounts.google.com";
/* example client configuration */
const clientId = "911932649741-nq4oh23cvkcqqc92ajclhouai62q4fjk.apps.googleusercontent.com";
const redirectUri = "http://127.0.0.1:8000";
const scopes = ['https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
    'https://www.googleapis.com/auth/classroom.profile.emails',
    'https://www.googleapis.com/auth/classroom.profile.photos'];

exports.AuthFlow = class AuthFlow {
    constructor() {
        const _this = this;
        this.notifier = new AppAuth.AuthorizationNotifier();
        this.authorizationHandler = new NodeSupport.NodeBasedHandler();
        this.tokenHandler = new AppAuth.BaseTokenRequestHandler(requestor);
        // set notifier to deliver responses
        this.authorizationHandler.setAuthorizationNotifier(this.notifier);
        // set a listener to listen for authorization responses
        // make refresh and access token requests.

        this.notifier.setAuthorizationListener(function (request, response, error) {
            if (response) {
                let codeVerifier;
                if (request.internal && request.internal.code_verifier) {
                    codeVerifier = request.internal.code_verifier;
                }
                _this.makeRefreshTokenRequest(response.code, codeVerifier)
                    .then(function (result) { return _this.performWithFreshTokens(); })
                    .then(function () {
                        _this.processData();
                    });
            }
        });
    }

    fetchServiceConfiguration = function () {
        const _this = this;
        return AppAuth.AuthorizationServiceConfiguration.fetchFromIssuer(openIdConnectUrl, requestor).then(function (response) {
            _this.configuration = response;
        });
    }

    makeAuthorizationRequest = function (username) {
        if (!this.configuration) {
            return;
        }
        // const extras = { prompt: "consent", access_type: "offline" };
        const extras = { access_type: "offline" };
        if (username) {
            extras["login_hint"] = username;
        }
        // create a request
        const request = new AppAuth.AuthorizationRequest({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scopes.join(" "),
            response_type: AppAuth.AuthorizationRequest.RESPONSE_TYPE_CODE,
            state: undefined,
            extras: extras
        }, new NodeSupport.NodeCrypto());
        this.authorizationHandler.performAuthorizationRequest(this.configuration, request);
    }

    makeRefreshTokenRequest = function (code, codeVerifier) {
        const _this = this;
        if (!this.configuration) {
            return Promise.resolve();
        }
        const extras = {};
        if (codeVerifier) {
            extras.code_verifier = codeVerifier;
        }
        // use the code to make the token request.
        const request = new AppAuth.TokenRequest({
            client_id: clientId,
            redirect_uri: redirectUri,
            grant_type: AppAuth.GRANT_TYPE_AUTHORIZATION_CODE,
            code: code,
            refresh_token: undefined,
            extras: extras
        });
        return this.tokenHandler
            .performTokenRequest(this.configuration, request)
            .then(function (response) {
                _this.refreshToken = response.refreshToken;
                _this.accessTokenResponse = response;
                fs.writeFileSync(path.join(__dirname, "oauthclient.json"), JSON.stringify({ "refreshToken": response.refreshToken }));

                return response;
            })
            .then(function () { });
    }

    loggedIn = function () {
        return !!this.accessTokenResponse && this.accessTokenResponse.isValid();
    }

    signOut = function () {
        // forget all cached token state
        this.accessTokenResponse = undefined;
    }

    performWithFreshTokens = function () {
        const _this = this;
        if (!this.configuration) {
            return Promise.reject("Unknown service configuration");
        }
        if (!this.refreshToken) {
            return Promise.resolve("Missing refreshToken.");
        }
        if (this.accessTokenResponse && this.accessTokenResponse.isValid()) {
            // do nothing
            return Promise.resolve(this.accessTokenResponse.accessToken);
        }
        const request = new AppAuth.TokenRequest({
            client_id: clientId,
            redirect_uri: redirectUri,
            grant_type: AppAuth.GRANT_TYPE_REFRESH_TOKEN,
            code: undefined,
            refresh_token: this.refreshToken,
            extras: undefined
        });
        return this.tokenHandler
            .performTokenRequest(this.configuration, request)
            .then(function (response) {
                _this.accessTokenResponse = response;
                return response.accessToken;
            });
    }

    signIn = function (username) {
        const _this = this;
        if (!this.loggedIn()) {
            return this.fetchServiceConfiguration().then(() => _this.makeAuthorizationRequest(username));
        }
        else {
            return Promise.resolve();
        }
    }

    makeAPIRequest = function (accessToken, url) {
        return new Promise((resolve, reject) => {
            const request = new Request(url, {
                headers: new Headers({ 'Authorization': "Bearer " + accessToken }),
                method: 'GET',
                cache: 'no-cache'
            });
            fetch(request)
                .then((result) => result.json())
                .then((data) => {
                    resolve(data);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    getCourses = function (accessToken) {
        const _this = this;

        return new Promise((resolve, reject) => {
            _this.makeAPIRequest(accessToken, 'https://classroom.googleapis.com/v1/courses')
                .then((coursesList) => {
                    resolve(coursesList);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    getUserInfo = function (accessToken) {
        const _this = this;

        return new Promise((resolve, reject) => {
            _this.makeAPIRequest(accessToken, 'https://classroom.googleapis.com/v1/userProfiles/me')
                .then((userInfo) => {
                    resolve(userInfo);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    getCourseWork = function (accessToken, courseId) {
        const _this = this;

        return new Promise((resolve, reject) => {
            _this.makeAPIRequest(accessToken, `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`)
                .then((courseWork) => {
                    resolve(courseWork);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    processData = function () {
        return new Promise(async (resolve, reject) => {
            const _this = this;
            const savedOauth = JSON.parse(fs.readFileSync(path.join(__dirname, "oauthclient.json")));

            if (!this.refreshToken && savedOauth.refreshToken != undefined) {
                this.refreshToken = savedOauth.refreshToken;
            }
            else if (savedOauth.refreshToken == undefined) {
                return this.signIn();
            }
            if (!this.configuration) {
                await this.fetchServiceConfiguration()
            }

            this.performWithFreshTokens()
                .then((accessToken) => _this.getData(accessToken)
                    .then(() => resolve())
                    .catch(err => reject(err)))
                .catch(err => reject(err))
        });
    }

    getData = function (accessToken) {
        const _this = this;

        return new Promise((resolve, reject) => {
            Promise.all([_this.getCourses(accessToken), _this.getUserInfo(accessToken)]).then(coursesAndUserInfo => {
                const courses = coursesAndUserInfo[0].courses.filter(e => e.courseState == "ACTIVE");;
                const userInfo = coursesAndUserInfo[1];
                const courseWorkPromises = courses.map(course => _this.getCourseWork(accessToken, course.id));

                Promise.all(courseWorkPromises).then(allCourseWork => {
                    const allDueCourseWork = allCourseWork.filter(course => course.courseWork != undefined).map(course => course.courseWork).flat().filter(e => {
                        if (e.dueDate == undefined) {
                            return false;
                        }

                        if (e.dueTime.hours == undefined) {
                            e.dueTime.hours = 24;
                        }
                        if (e.dueTime.minutes == undefined) {
                            e.dueTime.minutes = 59;
                        }

                        return new Date(e.dueDate.year, e.dueDate.month - 1, e.dueDate.day, e.dueTime.hours - 7, e.dueTime.minutes) > Date.now();
                    });

                    fs.writeFileSync(path.join(__dirname, "coursework.json"), JSON.stringify(allDueCourseWork));
                    resolve();
                });

                fs.writeFileSync(path.join(__dirname, "currentcourses.json"), JSON.stringify(courses));
                fs.writeFileSync(path.join(__dirname, "userinfo.json"), JSON.stringify(userInfo));
            });
        })
    }

    showWork = function () {
        const coursework = JSON.parse(fs.readFileSync(path.join(__dirname, "./coursework.json")));
        const classes = JSON.parse(fs.readFileSync(path.join(__dirname, "./currentcourses.json")));
        const userinfo = JSON.parse(fs.readFileSync(path.join(__dirname, "./userinfo.json")));
        const output = [];

        coursework.forEach(work => {
            work.class = classes.find(c => c.id == work.courseId);
            output.push(work);
        });

        return { 'userinfo': userinfo, 'classwork': output };
    }

    courseWorkJson = function () {
        return JSON.parse(fs.readFileSync(path.join(__dirname, "coursework.json")));
    }
}