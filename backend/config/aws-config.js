const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const S3_BUCKET = process.env.S3_BUCKET;

module.exports = { s3, S3_BUCKET };
// const AWS = require("aws-sdk");
// AWS.config.update({ region: "ap-south-1"});
// const s3 = new AWS.S3();
// const S3_BUCKET= "commithub-storage";
// module.exports = {s3,S3_BUCKET};