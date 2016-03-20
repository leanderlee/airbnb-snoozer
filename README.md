Airbnb Snooze
--------------------

On Amazon AWS Ubuntu image:
```bash
sudo apt-get update
sudo apt-get install -y libgtk2.0-0 libgconf-2-4 libnotify4 libasound2 libxtst6 libxss1 libnss3 xvfb
```

Get an account at [postmark](https://postmarkapp.com) and register with an email (this is to notify you if a snooze or relisting fails)

Create a `config.json`
```
{
	"email": "your-airbnb-email@domain.com",
	"password": "your-airbnb-password",
	"postmark_email": "your-postmark-email",
	"postmark_api": "your-postmark-api-key"
}
```

Create a cron job
```bash
crontab -e
```

then write
```
0 16 * * * xvfb-run /home/ubuntu/airbnb-snoozer/index.js -s
0 1 * * * xvfb-run /home/ubuntu/airbnb-snoozer/index.js
```

check that it's running after a while with
```bash
grep cron /var/log/syslog
```
