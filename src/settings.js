'use strict'

const isTrue = (settingName) => {
    return isEqualTo(settingName, "true");
};

const isFalse = (settingName) => {
    return isEqualTo(settingName, "false");
};

const isEqualTo = (settingName, value) => {
    return (req, res, next) => {
        if (process.env[settingName] !== value) {
            const validMessage = "Method unavailable due to Immers configuration.";
            return res.status(405).format({
            text: () => res.send(validMessage),
            json: () => res.json({ error: validMessage })
            })
        }
        next();
    }
};

module.exports = {
    isTrue,
    isFalse,
    isEqualTo
};