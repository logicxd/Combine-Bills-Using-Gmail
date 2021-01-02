# Combine Bills Using Gmail

Customizable and extensible way of collecting all your bills before sending out an email with a final receipt to your recipients.

![Composed Email](https://user-images.githubusercontent.com/12219300/103454759-00628d80-4c9c-11eb-99e5-35a6e7af1412.png)

## How It Works

General idea:

1. Fetches Gmails with the labels you provided.
2. Runs each email through the scripts (that you provide) to parse the amount. This includes reading and attaching files!
3. Adds any additional custom scripts that you may have.
4. Finally, composes an email using the parsed data to create a "final" receipt to send to your recipients.

An example of how I use it:

1. I get utility bills on my primary email account.
2. Forward them to my dev email account. This is to limit what emails you can access using Google API for safety.
3. Create filters to label my utility bills by water and electricity.
4. Write email scripts to extract the amount.
5. Download code on my raspbery pi and schedule it to run every month to send me monthly aggregated bills 🎉.

---

## Prerequisite

Will describe the steps later but an overview is:

* Refresh token, client id, and client secret to use Google API.
* Filter is set up on Gmail to automatically label your bills.

### Getting Gmail Refresh Token

I followed [this stackoverflow](https://stackoverflow.com/a/19766913) to make a refresh token to use Gmail API.
Since this is a dev account, I gave it scope of `https://mail.google.com/` (everything) but you can choose to limit if you want.
Note that this project requires the following:

* GetAttachment
* GetMessage
* ListLabels
* ListMessages
* SendMessages

These should be optional if you want to use the additional features:

* CreateLabel
* ModifyMessage

### Labeling Your Gmail

Please follow [this guide from Google](https://support.google.com/a/users/answer/9308833?hl=en).

---

## Setup

1. Create a new file called `config/config.secret.json` with the same properties from [config/config.sample.json](config/config.sample.json). These are optional properties: `cronitor_code`, `processedLabelName`. This is done this way for security (so you don't expose your secrets!). We could've also used environment variables but I wasn't going to use a server so this wasn't really needed.
2. To create `email scripts`, take a look [src/base_script.js](src/base_script.js) for what are the acceptable parameters. You can also look at [src/email_scripts/pgebill.js](src/email_scripts/pgebill.js) as an example. After you create your script, it will automatically fetch from Gmail API and add it to your final bill.
3. `Custom scripts` also uses [src/base_script.js](src/base_script.js) for acceptable parameters, although there are slight changes. Take a look at [src/custom_scripts/garbagebill.js](src/custom_scripts/garbagebill.js) as an example. This will also get automatically added to your final bill.
4. Don't forget to do a `npm install` and then finally, you can run it by executing `node src/index.js` in bash command line.

---

## How To's

### Overall Structure

[src/index.js](src/index.js) is where most of the logic happens. The method `start` should provide an example of how things are run.

### Modify the Email

You can modify it in the file [src/index.js](src/index.js) from the method `composeEmail()`.

### Tweak How Email Data is Collected

You can modify it in the file [src/index.js](src/index.js) from the method `getMessageDetails()`.

### Change How Far Back to Check

Currently, it checks 1 month and 1 day from today's date in UTC time. This is arbitrarly set since I would usually get a bill statement once a month. The 1 day is just for extra flexibility to make sure it includes all the new messages. When coupled with `processedLabelName` feature, I don't have to worry about double counting bills.

If you want to change this, you can change it in [src/utility.js](src/utility.js) inside the method `afterDate()`.

### Check Logs

Logs will be created at the root level as `./output-combined.log` and `./output-error.log` everytime it runs. You should be able to see it in the console logs and in those files.

### How Do Attachments Work?

Attachments, if found, will be downloaded into the `./attachments` folder. This folder is manually created and deleted after each run. When email is being composed, it will grab the base64 value from the file and attach it to the email.

---

## Setting it up on the Raspberry Pi (Optional)

You don't have to use Raspberry Pi if you know of a way to set up a scheduler yourself. This is just what I ended up using since I have an unused Raspberry Pi.

1. Install Raspbian (now called Raspberry Pi OS) on your Raspberry Pi. (I won't go over the details of how to set up Raspbian but I'll assume you've some way to access to it now)
2. Make sure you have the latest nodejs version. I have 14.15.3. I had to use this snippet to install the latest version: `curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -` which is taken from [NodeSource distributions](https://github.com/nodesource/distributions).
3. Setup as mentioned in [above](#setup).
4. Enable `crontab`. [This is a great guide](https://raspberrytips.com/schedule-task-raspberry-pi/) that I followed. My crontab ended up turning out to be: `0 0 26 * * cd <directory to your project> && node ./src/index.js` which will run every month on the 26th.

---

## Optional Features

### Stamping the "Processed" Label Name

Enabling this adds a "Processed" label to your email after the script has finished running. By doing this, it can check to make sure emails are not double-counted by ignoring all the "Processed" emails.

To enable it, add the property `email.processedLabelName` to your `config/config.secret.json` and give it whatever name you'd like it to be called, for example: "Automated/Processed" is what I used.

### Cronitor

I'm using [Cronitor](http://cronitor.io/) to notify me in case my raspberry pi doesn't send out an email. It's definitely not required but would help remind me in case something goes wrong.

To enable it, add the property `cronitor_code` to your `config/config.secret.json` with the value you get from Cronitor such as "abc123".

---

## Future

1. Check counting for multiple bills.

---

## Resources

* Get Google API refresh token - [stackoverflow](https://stackoverflow.com/a/19766913).
* [Crontab on raspberry pi](https://raspberrytips.com/schedule-task-raspberry-pi/).
* [Cronitor](http://cronitor.io/) - monitor crontabs.
* [Nodemailer](https://nodemailer.com/about/) for composing email messages
