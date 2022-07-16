const express = require('express')
const app = express()
const port = 3000
const expressSanitizer = require('express-sanitizer');
const compression = require('compression')
const bodyParser = require('body-parser')
const moment = require('moment')
const db = require('./db/db.js')

app.use(expressSanitizer())
app.use(compression())

app.set('view engine', 'pug')
app.use(express.static('public'))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use(require('./middleware/sanitize.js'))

app.use((req, res, next) => {

    // -----------------------------------------------------------------------
    // TEMP authentication middleware

    const auth = { login: '', password: '' } // change this

    // parse login and password from headers
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')

    // Verify login and password are set and correct
    if (login && password && login === auth.login && password === auth.password) {
        // Access granted...
        return next()
    }

    // Access denied...
    res.set('WWW-Authenticate', 'Basic realm="401"') // change this
    res.status(401).send('Authentication required.') // custom message

    // -----------------------------------------------------------------------

})

app.get('/', (req, res) => {

    let proceed = false
    let datetime
    let forts = []

    let db_reports

    db.query('SELECT `report_id`, `date`, `tag` FROM `reports` ORDER BY `date` DESC', []).then(function (reports) {

        db_reports = reports

        if (reports.length > 0) {

            if (req.query.date) {
                datetime = moment(req.query.date, 'YYYY-MM-DD', true)
                if (datetime.isValid()) {
                    proceed = true
                    datetime = moment(req.query.date).format('YYYY-MM-DD')
                }
            } else {
                datetime = moment(reports[0].date).format('YYYY-MM-DD')
                proceed = true
            }

            if (proceed) {
                let fort_info = []

                db.query('SELECT `report_id` FROM `reports` WHERE `date` = ?', [datetime]).then(function (result) {
                    if (result.length == 1) return result[0].report_id
                    return -1
                }).then(function (report_id) {
                    if (report_id != -1) {
                        return db.query('SELECT * FROM `fortress_info` WHERE `report_id` = ?', [report_id]).then(function (result) {
                            forts = result
                            return result
                        })
                    } else {
                        return false
                    }
                }).then(function (data) {

                    let promises = []

                    if (data.length > 0) {
                        for (var i = 0; i < data.length; i++) {
                            promises.push(db.query('SELECT * FROM `fortress_info_unit` JOIN `fortress_info` ON `fortress_info`.`fortress_info_id` = `fortress_info_unit`.`fortress_info_id` WHERE `fortress_info_unit`.`fortress_info_id` = ? ORDER BY `update_time` DESC', [data[i].fortress_info_id]).then(function (result) {
                                fort_info.push(result[0])
                            }))
                        }
                    }

                    return promises
                }).then(function (promises) {
                    Promise.all(promises).then(function () {

                        let fort_info_obj = {}

                        for (var i = 0; i < fort_info.length; i++) {
                            if (fort_info[i]) {
                                fort_info[i].update_time = moment(fort_info[i].update_time).format('HH:mm')
                                if (fort_info[i].fortress_type != 5) {
                                    fort_info_obj[fort_info[i].fortress_type] = fort_info[i]
                                } else {
                                    fort_info_obj[fort_info[i].fortress_info_id] = fort_info[i]
                                }
                            }
                        }

                        let dates = []
                        let date_tags = {}

                        for (var i = 0; i < db_reports.length; i++) {
                            let format_date = moment(db_reports[i].date).format('YYYY-MM-DD')
                            dates.push(format_date)
                            date_tags[format_date] = db_reports[i].tag || 'No Name'
                        }

                        let small_forts = []

                        for (var i = 0; i < forts.length; i++) {
                            if (forts[i].fortress_type == 5) {
                                small_forts.push(forts[i])
                            }
                        }

                        res.render('index', { fort_info_obj, today_date: datetime, dates, date_tags, small_forts })
                    })
                })
            } else {
                res.redirect('/')
            }
        } else {
            res.render('index', { fort_info_obj: {}, today_date: moment(new Date()).format('YYYY-MM-DD'), dates: [], small_forts: [] })
        }
    })
})

app.get('/fortress', (req, res) => {

    let forts = {
        '1': 'Top Fort',
        '2': 'Mid Fort',
        '3': 'Bottom Fort',
        '4': 'Stronghold'
    }

    let proceed = false
    let datetime

    if (req.query.date) {
        datetime = moment(req.query.date, 'YYYY-MM-DD', true)
        if (datetime.isValid()) {
            proceed = true
            datetime = moment(req.query.date).format('YYYY-MM-DD')
        }
    } else {
        datetime = moment(new Date()).format('YYYY-MM-DD')
        proceed = true
    }

    if (req.query.fort) {
        if (req.query.fort <= 0) proceed = false
    } else {
        proceed = false
    }

    if (proceed) {
        let fort_info = []

        db.query('SELECT `report_id` FROM `reports` WHERE `date` = ?', [datetime]).then(function (result) {
            if (result.length == 1) return result[0].report_id
            return -1
        }).then(function (report_id) {
            if (report_id != -1) {

                if (req.query.fort > 4) {
                    return db.query('SELECT * FROM `fortress_info` WHERE `report_id` = ? AND `fortress_info_id` = ?', [report_id, req.query.fort]).then(function (result) {
                        return result
                    })
                } else {
                    return db.query('SELECT `fortress_info_id` FROM `fortress_info` WHERE `report_id` = ? AND `fortress_type` = ?', [report_id, req.query.fort]).then(function (result) {
                        return result
                    })
                }
            } else {
                return false
            }
        }).then(function (data) {

            let promises = []

            if (data) {
                for (var i = 0; i < data.length; i++) {
                    promises.push(db.query('SELECT * FROM `fortress_info_unit` WHERE `fortress_info_id` = ?', [data[i].fortress_info_id]).then(function (result) {
                        fort_info.push(result)
                    }))
                }
            }

            return promises
        }).then(function (promises) {
            Promise.all(promises).then(function () {

                let round_one = {}, round_two = {}
                let unit_images = {}

                let promises = []

                if (fort_info[0]) {
                    for (var i = 0; i < fort_info[0].length; i++) {
                        fort_info[0][i].round == 1 ? round_one[fort_info[0][i].slot - 1] = fort_info[0][i] : round_two[fort_info[0][i].slot - 1] = fort_info[0][i]

                        promises.push(db.query('SELECT * FROM `unit_info` WHERE `unit_name` = ?', [fort_info[0][i].unit_id]).then(function (result) {
                            for (var i = 0; i < result.length; i++) {
                                unit_images[result[i].unit_name] = result[i].unit_image
                            }
                        }))
                    }
                }

                db.query('SELECT * FROM `unit_info`', []).then(function (result) {

                    let names = []
                    for (var i = 0; i < result.length; i++) {
                        names.push(result[i].unit_name)
                    }

                    names = names.sort()

                    Promise.all(promises).then(function () {
                        res.render('fortress', { units: names, round_one, round_two, datetime, fort: req.query.fort, fort_name: forts[req.query.fort], unit_images })
                    })
                })
            })
        })
    } else {
        res.redirect('/')
    }
})

app.post('/update-unit', (req, res) => {

    if (req.body) {
        if (req.body.unit_slot &&
            req.body.unit_round &&
            req.body.datetime &&
            req.body.fort &&
            req.body.unit_id &&
            req.body.unit_speed &&
            req.body.unit_health &&
            req.body.artifact_id &&
            req.body.unit_immunity &&
            req.body.updater_id) {

            req.body.unit_immunity = req.body.unit_immunity ? (req.body.unit_immunity == '1' ? true : false) : false

            let fortress_id

            db.query('SELECT `report_id` FROM `reports` WHERE `date` = ?', [req.body.datetime]).then(function (result) {
                if (result.length == 1) return result[0].report_id
                return -1
            }).then(function (report_id) {
                if (report_id != -1) {
                    if (req.body.fort > 4) {
                        return db.query('SELECT * FROM `fortress_info` WHERE `report_id` = ? AND `fortress_info_id` = ?', [report_id, req.body.fort]).then(function (result) {
                            return result[0]
                        })
                    } else {
                        return db.query('SELECT `fortress_info_id` FROM `fortress_info` WHERE `report_id` = ? AND `fortress_type` = ?', [report_id, req.body.fort]).then(function (result) {
                            return result[0]
                        })
                    }
                } else {
                    return false
                }
            }).then(function (data) {

                if (data) {
                    fortress_id = data.fortress_info_id

                    return db.query('SELECT * FROM `fortress_info_unit` WHERE `fortress_info_id` = ? AND `slot` = ? AND `round` = ?', [fortress_id, req.body.unit_slot, req.body.unit_round]).then(function (result) {
                        return result
                    })
                } else {
                    return false
                }
            }).then(function (data) {

                if (data !== false) {
                    if (data.length == 0) { // create new
                        return db.query('INSERT INTO `fortress_info_unit` (`fortress_info_id`, `round`, `slot`, `unit_id`, `unit_speed`, `unit_health`, `unit_artifact`, `immunity`, `updater`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [fortress_id, req.body.unit_round, req.body.unit_slot, req.body.unit_id, req.body.unit_speed, req.body.unit_health, req.body.artifact_id, req.body.unit_immunity, req.body.updater_id]).then(function () {
                            res.redirect('/fortress?fort=' + req.body.fort + '&date=' + req.body.datetime)
                        })
                    } else { // update
                        return db.query('UPDATE `fortress_info_unit` SET `unit_id` = ?, `unit_speed` = ?, `unit_health` = ?, `unit_artifact` = ?, `immunity` = ?, `updater` = ?, `update_time` = ? WHERE `fortress_info_id` = ? AND `round` = ? AND `slot` = ?', [req.body.unit_id, req.body.unit_speed, req.body.unit_health, req.body.artifact_id, req.body.unit_immunity, req.body.updater_id, new Date(), fortress_id, req.body.unit_round, req.body.unit_slot]).then(function () {
                            res.redirect('/fortress?fort=' + req.body.fort + '&date=' + req.body.datetime)
                        })
                    }
                } else {
                    res.redirect('/')
                }
            })
        }

    } else {
        res.redirect('/')
    }
})

app.post('/new-report', (req, res) => {
    if (req.body) {

        let datetime = moment(req.body.date, 'YYYY-MM-DD', true)

        if (datetime.isValid()) {
            db.query('INSERT INTO `reports` (`date`) VALUES (?);', [req.body.date], true).then(function (result) {
                return result
            }).then(function (index) {
                return db.query('INSERT INTO `fortress_info` (`report_id`, `fortress_type`) VALUES (?, ?), (?, ?), (?, ?), (?, ?);', [index, 1, index, 2, index, 3, index, 4])
            }).then(function () {
                res.redirect('/?date=' + req.body.date)
            }, function (err) {
                res.redirect('/')
            })
        } else {
            res.redirect('/')
        }
    } else {
        res.redirect('/')
    }
})

app.get('/get-comments', (req, res) => {
    if (req.query.unit) {

        let unit_id = req.query.unit

        db.query('SELECT * FROM `comments` WHERE `fortress_info_unit_id` = ?', [unit_id]).then(function (result) {
            for (var i = 0; i < result.length; i++) {
                result[i].creation_datetime = moment(result[i].creation_datetime).format('YYYY-MM-DD HH:mm')
            }
            res.send(result)
        })
    } else {
        res.send([])
    }
})

app.post('/new-comment', (req, res) => {
    if (req.body) {

        let unit_id = req.body.unit_id
        let author_id = req.body.author_id
        let comment = req.body.comment

        db.query('INSERT INTO `comments` (`fortress_info_unit_id`, `comment`, `author`) VALUES (?, ?, ?)', [unit_id, comment, author_id]).then(function (result) {
            res.redirect('/fortress?fort=' + req.body.fort + '&date=' + req.body.datetime)
        })
    } else {
        res.redirect('/')
    }
})

app.post('/update-name', (req, res) => {
    if (req.body) {

        let date = req.body.date
        let guild_name = req.body.guild_name

        db.query('UPDATE `reports` SET `tag` = ? WHERE `date` = ?', [guild_name, date]).then(function () {
            res.redirect('/?date=' + date)
        })
    } else {
        res.redirect('/')
    }
})

app.post('/new-fort', (req, res) => {
    if (req.body) {

        let fort_name = req.body.fort_name
        let datetime = moment(req.body.date, 'YYYY-MM-DD', true)

        if (datetime.isValid()) {
            db.query('SELECT * FROM `reports` WHERE `date` = ?', [req.body.date]).then(function (result) {
                return result[0].report_id
            }).then(function (index) {
                return db.query('INSERT INTO `fortress_info` (`report_id`, `fortress_type`, `tag`) VALUES (?, ?, ?)', [index, 5, fort_name])
            }).then(function () {
                res.redirect('/?date=' + datetime)
            })
        } else {
            res.redirect('/')
        }
    } else {
        res.redirect('/')
    }
})


app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
})