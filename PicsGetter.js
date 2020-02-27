const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline-sync');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose', 'https://www.googleapis.com/auth/gmail.send'];

const TOKEN_PATH = 'token.json';

class PicsGetter {

    async authorize() {
        const credentials = JSON.parse(fs.readFileSync('credentials.json'));
        const { client_secret, client_id, redirect_uris } = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        try {
            const tokenContents = fs.readFileSync(TOKEN_PATH);
            const _token = JSON.parse(tokenContents);
            oAuth2Client.setCredentials(_token);
            return oAuth2Client;
        } catch (e) {
            return await getNewToken(oAuth2Client);
        }
    }

    async getNewToken(oAuth2Client) {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        });
        console.log('Authorize this app by visiting this url:', authUrl);

        const code = readline.question('Enter the code from that page here: ');

        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
            console.log('Token stored to', TOKEN_PATH);
            return oAuth2Client;
        });
    }

    constructor() {
        return (async () => {
            const auth = await this.authorize();
            this.auth = auth;
            this.me = 'abashin.d@gmail.com';
            this.gmail = google.gmail({ version: 'v1', auth });
            return this;
        })();
    }

    async getDesirableMails(amount, subj, type) {
        try {
            let is = '';
            if (type === 'unread') {
                is = 'is:unread'; }
            if (type === 'read') {
                is = 'is:read';
            }
            const query = `from:abashin.d@gmail.com ${is} subject:${subj}`;
            const result = await this.gmail.users.messages.list({
                userId: this.me,
                q: query,
                maxResults: amount
            });
            return result.data.messages;
        }
        catch (e) {
            console.error('Что то пошло не так при получении писем...', e.message);
            return e.message;
        }    
    }

    async getAttachmentsFromMails(mailsHeaders) {
        const attachments = new Map();
        if (mailsHeaders === undefined | mailsHeaders === null) {
            return attachments;}
        for (let i = 0; i < mailsHeaders.length; i++) {
            const mailHeader = mailsHeaders[i];
            const _attachments = await this.getAttachmentsFromMail(mailHeader.id);
            console.log(`Handled ${i + 1} messages.`);
            for (let [name, pic] of _attachments) {
                attachments.set(name, pic);
            }
        }
        return attachments;
    }

    async getAttachmentsFromMail(mailId) {
        const mail = await this.getMailById(mailId);
        const parts = mail.data.payload.parts;
        const attachments = new Map();
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.filename && part.filename.length > 0) {
                const attachId = part.body.attachmentId;
                const attachment = await this.gmail.users.messages.attachments.get({
                    'id': attachId,
                    'messageId': mailId,
                    'userId': this.me
                });

                let attachmentBase64 = attachment.data.data;
                attachmentBase64 = attachmentBase64.replace(/-/g, '+').replace(/_/g, '/');
                attachments.set(part.filename, attachmentBase64);
            }
        }
        return attachments;
    }

    async getMailById(mailId) {
        return await this.gmail.users.messages.get({
            'userId': this.me,
            'id': mailId
        });
    }

    async trashMail(mailId) {
        await this.gmail.users.messages.trash({
            'userId': this.me,
            'id': mailId
        });
    }
}

module.exports = PicsGetter;