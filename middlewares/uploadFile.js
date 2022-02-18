const multer = require('multer')

// setup multer
const storage = multer.diskStorage({
    destination: function (request, file, cb) {
        cb(null, "uploads")
    },
    filename: function (request, file, cb) {
        cb(null, Date.now() + "-" + file.originalname.replace(/\s/g, ""))
    }
})

// implementasi configurasi
const upload = multer({
    storage: storage
})

module.exports = upload