const JSZip = require('jszip');
var stream = require('stream');
const Getter = require('./PicsGetter');

async function getPicsAsPage(amount, subj, type) {
    const getter = await new Getter();
    const mails = await getter.getDesirableMails(amount, subj, type);
    const attachments = await getter.getAttachmentsFromMails(mails);

    let picsPage = '';
    if (attachments.size === 0) {
        picsPage = '<h1>Found no desirable mails or mails didnt content attachments...</h>';
    }

    for (let [name, pic] of attachments) {
        picsPage += `<div>
                        <img src = "data:image/jpg;base64, ${pic}" alt="${name}"/>
                    </div>`;
    }
    return new Buffer.from(picsPage);
}

async function getPicsAsZip(amount, subj, type) {
    const getter = await new Getter();
    const mails = await getter.getDesirableMails(amount, subj, type);
    const attachments = await getter.getAttachmentsFromMails(mails);

    const zip = new JSZip();
    if (attachments.size === 0) {
        zip.file('FoundNothing.txt', 'Found no desirable mails or mails didnt content attachments...\n');
    }

    for (let [name, pic] of attachments) {
        zip.file(name, pic, {base64: true});
    }
    const zipBuf = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'STORE',
        streamFiles: true
    });
    const _stream = new stream.PassThrough();
    _stream.end(zipBuf);

    return {
        'mails': mails,
        'stream': _stream
        
    };
}

module.exports.getPicsAsPage = getPicsAsPage;
module.exports.getPicsAsZip = getPicsAsZip;
