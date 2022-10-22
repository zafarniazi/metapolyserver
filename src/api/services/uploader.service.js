
const multer = require('multer');
const uuidV4 = require('uuid').v4;


module.exports = {
    localUpload: (folder_name, fileFilter = null) => {
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, '.' + folder_name);
            },
            filename: (req, file, cb) => {
                const extension = file.originalname.substring((file.originalname.lastIndexOf('.') + 1), file.originalname.length);
                const updatedFileName = file.fieldname + '-' + uuidV4() + '.' + extension;
                cb(null, updatedFileName);
            },
            fileFilter
        });

        return multer({ storage: storage });
    },
}