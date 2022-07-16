const auth = async (req, res, next) => {
    
    if (req.body) {
        let keys = Object.keys(req.body)
        if (keys.length > 0) {
            for (var i = 0; i < keys.length; i++) {
                if (Array.isArray(req.body[keys[i]])) {
                    req.body[keys[i]] = req.body[keys[i]].map(x => req.sanitize(x));
                } else {
                    req.body[keys[i]] = req.sanitize(req.body[keys[i]]);
                }
            }
        }
    }

    if (req.query) {
        let keys = Object.keys(req.query)
        if (keys.length > 0) {
            for (var i = 0; i < keys.length; i++) {
                req.query[keys[i]] = req.sanitize(req.query[keys[i]])
            }
        }
    }

    next()
}

module.exports = auth
