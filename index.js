#!/usr/bin/env node

var program = require('commander');

program
  .option('-s, --snooze', 'Should snooze.')
  .option('-d, --debug', 'Show window.')
  .option('-c, --config [file]', 'Config file.', './config.json')
  .parse(process.argv);

if (program.debug) {
  process.env.DEBUG = '*';
}

var CONFIG = require(program.config);
var Nightmare = require('nightmare');
var moment = require('moment');
var Postmark = require('postmark');
var USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36';
var AIRBNB_EMAIL = CONFIG.email;
var AIRBNB_PASS = CONFIG.password;
var POSTMARK = CONFIG.postmark_api;
var LISTING = CONFIG.listing;
var TIMEOUT = CONFIG.timeout || 60*1000;
var SNOOZE = program.snooze;
var ACTION = SNOOZE ? 'snoozing' : 'listing';


console.log("%s - (%s) listing %s.\ndial airbnb.com (timeout %d)...", ACTION, AIRBNB_EMAIL, LISTING, TIMEOUT);

var nightmare = Nightmare({ show: program.debug })
var postmark = new Postmark.Client(POSTMARK);
var timeout = setTimeout(function () {
  nightmare.end();
  postmark.sendEmail({
    From: 'Airbnb Snoozer <' + CONFIG.postmark_email + '>', 
    To: AIRBNB_EMAIL,
    Subject: '***** [FAILED] ***** Airbnb Snoozer has failed!',
    HtmlBody: `
      Hello ${AIRBNB_EMAIL},<br>
      <br>
      I'm afraid we have failed your great one. We had problems ${ACTION} your <a href="https://airbnb.com/manage-listing/${LISTING}">listing</a>.<br>
      <br>
      Please set it manually and someone will be looking into it shortly!<br>
      <br>
      Thanks,<br>
      Airbnb Snoozer
    `,
    TextBody: `We had problems ${ACTION} your listing ${LISTING} for user ${AIRBNB_EMAIL}`
  }, function () {
    console.log("snooze failed - timeout.");
    process.exit(1);
  });
}, TIMEOUT)

nightmare
  .useragent(USER_AGENT)
  .goto('https://airbnb.com/logout')
  .goto('https://airbnb.com/login')
  .wait(100)
  .type('#signin_email', AIRBNB_EMAIL)
  .type('#signin_password', AIRBNB_PASS)
  .wait(100)
  .click('#user-login-btn')
  .wait(100)
  .goto('https://airbnb.com/manage-listing/' + LISTING)
  .run(function () {
    if (SNOOZE) {
      var snooze_until = moment().add(1, 'week').format('L');
      nightmare
        .wait('#availability-dropdown')
        .select('#availability-dropdown select', 'snoozed')
        .wait('form.snooze-mode-form')
          .insert('form.snooze-mode-form input[name=end-date]', '')
          .type('form.snooze-mode-form input[name=end-date]', snooze_until)
        .click('.snooze-modal .btn.btn-primary')
        .click('.snooze-modal .btn.btn-primary')
        .wait('#availability-dropdown .dot.dot-red')
        .end()
        .then(function () {
          clearTimeout(timeout);
          postmark.sendEmail({
            From: 'Airbnb Snoozer <' + CONFIG.postmark_email + '>', 
            To: AIRBNB_EMAIL,
            Subject: 'Airbnb Snoozed!',
            HtmlBody: `
              Hello ${AIRBNB_EMAIL},<br>
              <br>
              We just snoozed your <a href="https://airbnb.com/manage-listing/${LISTING}">listing</a>.
              <br>
              Thanks,<br>
              Airbnb Snoozer
            `,
            TextBody: `We have began ${ACTION} your listing ${LISTING} for user ${AIRBNB_EMAIL}`
          }, function () {
            console.log("snooze succeeded.");
            process.exit(0);
          });
        })
    } else {
      nightmare
        .wait('#availability-dropdown')
        .select('#availability-dropdown select', 'listed')
        .wait('#availability-dropdown .dot.dot-success')
        .end()
        .then(function () {
          clearTimeout(timeout);
          postmark.sendEmail({
            From: 'Airbnb Snoozer <' + CONFIG.postmark_email + '>', 
            To: AIRBNB_EMAIL,
            Subject: 'Airbnb Relisted!',
            HtmlBody: `
              Hello ${AIRBNB_EMAIL},<br>
              <br>
              We have started your <a href="https://airbnb.com/manage-listing/${LISTING}">listing</a> again.<br>
              <br>
              Thanks,<br>
              Airbnb Snoozer
            `,
            TextBody: `We have began ${ACTION} ${LISTING} for user ${AIRBNB_EMAIL}`
          }, function () {
            console.log("listing succeeded.")
            process.exit(0);
          });
        })

    }
  })
