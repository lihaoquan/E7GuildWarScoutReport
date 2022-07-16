const mysql = require('mysql2')

var pool = mysql.createPool({
    multipleStatements: true,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'guildwarscoutreport',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

function query(sql, arr, retrieveLastIndex = false) {
    return new Promise(function (resolve, reject) {
        pool.getConnection(function (err, conn) {
            conn.execute(sql, arr, function (error, result, fields) {
                if (error) {
                    reject(error)
                    conn.query('ROLLBACK;', function (error, results, fields) {
                        if (error) { 
                            console.log(error)
                            console.log(sql)
                        }
                    })
                } else {
                    if (!retrieveLastIndex) {
                        resolve(result)
                    } else {
                        resolve(result.insertId)
                    }
                    conn.query('COMMIT;', function (error, results, fields) {
                        if (error) console.log(error)
                    })
                }
            })
            pool.releaseConnection(conn)
        })
    })
}

module.exports = {
    query
}