const readline = require('readline')
const fs = require('fs')

const readInterface = readline.createInterface({
    input: fs.createReadStream('./name_list.txt'),
    console: false
})

let files = []

fs.readdir('./public/img/characters', (err, files) => {
    files.forEach(file => {
        files.push(file)
    })

    let i = -1
    readInterface.on('line', function (line) {
        i++
        console.log("INSERT INTO `unit_info` (`unit_image`, `unit_name`) VALUES ('" + files[i] + "', '" + line + "');")
    })
})