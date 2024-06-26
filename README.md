# Sauce for Zwift without the Patreon block
Use Sauce for Zwift without the Patreon prompt that prevents you from
using it unless you make financial contributions to the author.

### Is this fair?
That's a judgement call for each of you to make. The important question is...

### Is this legal?
Yes. The original Sauce for Zwift is distributed under the
[GNU General Public License v3](https://www.gnu.org/licenses/gpl-3.0.en.html),
which allows for redistribution of the source code with any modifications under
the same license, which is what I'm doing here.

### But the poor guy has to eat!
And you're still free to donate to him if you so wish, to show your appreciation
for the program he created.

## Installation* instructions (Mac)
Please note that, to be precise, these are *running* instructions, as you won't
be installing an app in your `/Applications` directory.

For the power users, I assume you have `brew`. Install `npm` if you don't have
it with `brew install npm`, clone this repository, go to the root of the
repository and run `make run`.

For all the rest, here are the instructions in a *for dummies* mode.

First, open the Terminal app (from `/Applications/Utilities/Terminal`). It can
be intimidating the first time, but you'll just need to copy commands.

### 1. Install brew
Copy this command, paste it in the terminal and press Enter to run it. It will
ask for your password, the one you use in your Mac, as you're installing a
utility that does stuff with system files.

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

At the end of this installation you'll see a message saying "Next steps". Please
follow those instructions so that the `brew` command will be available to you.
You can check whether brew is installed by running `brew -v`. If you get a
couple of lines mentioning `Homebrew`, you got it. If you get "Command not
found: brew" or a similar error, you need to perform the "Next Steps" as
mentioned before. You can also try closing the Terminal app and opening it
again.

### 2. Install npm
Now you'll use `brew` from the previous step to install another program called
`npm`.

```sh
brew install npm
```

### 3. Clone this repository
This will copy this repository in your `Downloads` directory so that you can
build and run Sauce from there. Execute these lines one by one:

```sh
cd ~/Downloads
git clone https://github.com/janoma/sauce4zwift.git
```

If this is the first time you're using the program called `git`, your Mac will
ask you to install some "Command Line Utilities". Accept and wait for the
installation, then run the `git` command again, because the first time it
wouldn't have run.

### 4. Build and run Sauce
Go to the root of the repository and use `make run` to build and run Sauce:

```sh
cd ~/Downloads/sauce4zwift
make run
```

You'll need to keep the Terminal app open while Sauce is running.

Your login information is stored in the system keychain, so it will be secure
and it can be reused over subsequent launches of Sauce. The keychain usage will
probably require your password once, the first time you log in with your main
Zwift account and your secondary account.

You can close Sauce as usual with ⌘+Q from the 'Electron' app.

### Running it again
To run Sauce again, open the Terminal app and repeat step 4 above. From the
second time, launching Sauce will be faster because the "build" happened the
first time.

## Installation* instructions (Windows)
Please note that, to be precise, these are *running* instructions, as you won't
be installing an app in your `C:\Program Files` directory.

Also note that Windows is not my main operating system, so the instructions here
could very well be more complex than needed, but they did work for me. I use
Windows 10 Home.

### 1. Install required apps
Download and install [nodejs](https://nodejs.org/en/download/),
[git](https://git-scm.com/download/win),
[python](https://www.python.org/downloads/windows/) and
[PowerShell](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-windows?view=powershell-7.2#msi).

Open PowerShell **in administrator mode** and follow [these instructions](https://chocolatey.org/install)
to install Chocolatey. Once the `choco` command is available to you, use it to
install `make`:

```sh
choco install make
```

Download and install [Visual Studio](https://visualstudio.microsoft.com/downloads/).
The free Community edition is fine. When you install, select the following Workloads:
**Node.js development**, **Desktop development with C++** and **Game development with
C++**. This is probably more than what you actually need, but it worked for me.

### 2. Clone repository
Open PowerShell and go to the Downloads directory

```sh
cd ~\Downloads
```

Call `git` to copy the code you'll need:

```sh
git clone https://github.com/janoma/sauce4zwift.git
```

### 3. Build and run Sauce
In PowerShell, go to the directory where the repository was copied and run `make run`:

```sh
cd ~\Downloads\sauce4zwift
make run
```

You'll need to keep the PowerShell app open while Sauce is running.

The first time it will take a minute or two to "build" the program before it runs.

### Running it again
To run Sauce again, open PowerShell and repeat the instructions in Step 3.
Remember that launching Sauce after the first time should be faster.

## Installation instructions (Mac)
I'm planning to generate the binaries as soon as I have some time for it, but
for now, you can follow these instructions to run it. You'll need to open the
Terminal app. If that's scary, you'll just need to copy commands.

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

At the end of this installation you'll see a message saying "Next steps". Please
follow those instructions so that the `brew` command will be available to you.
You can check whether brew is installed by running `brew -v`. If you get a
couple of lines mentioning `Homebrew`, you got it. If you get "Command not
found: brew" or a similar error, you need to perform the "Next Steps" as
mentioned before. You can also try closing the Terminal app and opening it
again.

### 2. Install npm
Now you'll use `brew` from the previous step to install another program called
`npm`.

```sh
brew install npm
```

### 3. Clone this repository
This will copy this repository in your `Downloads` directory so that you can
build and run Sauce from there. Execute these lines one by one:

```sh
cd ~/Downloads
git clone https://github.com/janoma/sauce4zwift.git
```

If this is the first time you're using the program called `git`, your Mac will
ask you to install some "Command Line Utilities". Accept and wait for the
installation, then run the `git` command again, because the first time it
wouldn't have run.

### 4. Build and run Sauce
Go to the root of the repository and use `make run` to build and run Sauce:

```sh
cd ~/Downloads/sauce4zwift
make run
```

You'll need to keep the Terminal app open while Sauce is running.

Your login information is stored in the system keychain, so it will be secure
and it can be reused over subsequent launches of Sauce. The keychain usage will
probably require your password once, the first time you log in with your main
Zwift account and your secondary account.

You can close Sauce as usual with ⌘+Q from the 'Electron' app.

### Running it again
To run Sauce again, open the Terminal app and repeat step 4 above. From the
second time, launching Sauce will be faster because the "build" happened the
first time.

***

Sauce for Zwift™
===========
![Sauce](pages/images/logo_horiz_320x120.png)
#### A collection of add-ons and replacement widgets for Zwift
Sauce for Zwift™ extends the zwift cycling and running simulator with more stats and
pretty things.


Requirements:
--------
As of July 2022 Sauce is a full encrypted game client that "watches" your normal
Zwift account like a 2nd instance of Zwift itself.  As such, you'll need to create
a second login (free is fine).  Although a bit annoying this does allow you to
run S4Z on any device, anywhere.


Download for Mac / Windows / Linux:
--------
https://www.sauce.llc/products/sauce4zwift/download


--------
<img src="assets/images/screenshot.jpg" width="640"/>
<img src="assets/images/slideshow.webp" width="400"/>

Great overview video from Si Bradeley...

[![Intro Video](https://img.youtube.com/vi/NZNgZW6YCp0/hqdefault.jpg)](https://www.youtube.com/watch?v=NZNgZW6YCp0)


Feature Highlights
--------
 * Draft power savings:
   * See how much power you're saving by being in the draft.
 * Groups view:
   * See the size of your group and others nearby
   * Show the time gap to the groups ahead and behind
   * Accurate gap measurement with virtual checkpoints.  All road positions are
     continually recorded with timestamps for all nearby riders.  The gaps are
     real values from when riders crossed the same point.  Geometric based estimates
     are only used as a fallback when road positions are not yet available (rare).
 * Real stats:
   * Average and Max for power, HR, cadence, speed and event draft
   * Rolling Averages (5s, 5min, etc) for most metrics (power, hr, etc)
   * Peak Averages (5s, 5min, etc) for most metrics (power, hr, etc)
   * [NP®](#tp), [TSS®](#tp), kJ
   * Laps
 * Map with full route preview:
   * See the elevation profile for the route you are on
   * Interactive zoom and pan
   * Optional perspective tilting
   * Chat bubbles appear over athletes sending messages
 * Controllable by event organizers:
  * Add hashtags to your event description to control Sauce for athletes in your event
 * Highly configurable:
   * Dynamic scaling of almost every component to suit all needs
   * Chroma key support for OBS streamers
   * Almost every field can be changed
   * Pick and choose which windows you want visible and configure each of them with unique custom settings
 * Gauges:
   * Power (with zones), Draft, Speed, HR
 * Improved chat client:
   * Avatar
   * Gap to athlete
   * Real time power, hr of athlete
   * Support for muting specific athletes
 * Nearby riders/runners table with extensive field options.
 * Built-in Web server allows access to most of the widgets.
   * Port 1080 (configurable) e.g. http://localhost:1080
   * REST / WebSocket API for programmers (See /api for a directory)
 * Mods / Plugins supported
   * See https://github.com/saucellc/sauce4zwift-mod-example for details


Headless mode (ADVANCED):
--------
Sauce can run as a standalone web server if you don't need or want the overlay window
capabilities.  You will need to provide credentials via the command line or through
shell environment variables.  Full usage details are given when your run Sauce
with the arguments `--headless` and `--help`.  For example...
```shell
$ ./sauce4zwift-1.1.4-dev.AppImage --headless --help
Usage: ./sauce4zwift-1.1.4-dev.AppImage [--headless] --main-username USERNAME
  --main-password PASSWORD --monitor-username USERNAME --monitor-password PASSWORD
  [--athlete-id ATHLETE_ID] [--random-watch [COURSE_ID]]
  [--disable-game-connection] [--debug-game-fields] [--help]

Arguments:
  --headless                      Run in headless mode.  NOTE: All settings for
                                  headless mode are seperate from normal mode.
  --main-username USERNAME        The main Zwift username (email)
                                  (env variable: MAIN_USERNAME)
                                  [REQUIRED]
  --main-password PASSWORD        The main Zwift password
                                  (env variable: MAIN_PASSWORD)
                                  [REQUIRED]
  --monitor-username USERNAME     The monitor Zwift username (email)
                                  (env variable: MON_USERNAME)
                                  [REQUIRED]
  --monitor-password PASSWORD     The monitor Zwift password
                                  (env variable: MON_PASSWORD)
                                  [REQUIRED]
  --athlete-id ATHLETE_ID         Override the athlete ID for the main Zwift
                                  account
  --random-watch [COURSE_ID]      Watch random athlete; optionally specify a
                                  Course ID to choose the athlete from
  --disable-game-connection       Disable the companion protocol service
  --debug-game-fields             Include otherwise hidden fields from game data
                                  [default=true]
  --help                          Show this info about args
```

```shell
$ MON_PASSWORD=secret MAIN_PASSWORD=othersecret ./sauce4zwift-1.1.4-dev.AppImage \
    --headless \
    --main-username foobar@gmail.com \
    --monitor-username foobar+sauce@gmail.com
...
Startup took 385ms
Web server started at: http://192.168.17.100:1080/
  HTTP API at: http://192.168.17.100:1080/api
  WebSocket API at: ws://192.168.17.100:1080/api/ws/events
Web server started at: https://192.168.17.100:1081/
  HTTP API at: https://192.168.17.100:1081/api
  WebSocket API at: wss://192.168.17.100:1081/api/ws/events
...
```


Event Organizer Hashtags
--------
**For Event Organizers only:**
Control Sauce behavior for your events with these tags:
https://www.sauce.llc/products/sauce4zwift/event_hashtags



Release Notes
--------
https://www.sauce.llc/products/sauce4zwift/release_notes


Support my work
--------
<a href="https://www.patreon.com/bePatron?u=32064618" target="_blank">
    <img src="pages/images/become_a_patron_button@2x.png" width="150"/>
</a>


Disclaimer
--------
I don't work for Zwift nor do I represent them.  I assume no liability bla
bla bla.  You get the idea.


Attribution
--------
 * <a id="tp"></a> Normalized Power®, NP®, Training Stress Score®, TSS®,
   Intensity Factor®, IF® are trademarks of TrainingPeaks, LLC and are used with permission.

   Learn more at <a href="https://www.trainingpeaks.com/learn/articles/glossary-of-trainingpeaks-metrics/?utm_source=newsletter&utm_medium=partner&utm_term=sauce_trademark&utm_content=cta&utm_campaign=sauce">https://www.trainingpeaks.com/learn/articles/glossary-of-trainingpeaks-metrics/</a>.


Legal
--------
[Privacy Policy](https://www.sauce.llc/legal/sauce4zwift-privacy.html)
[Terms and Conditions](https://www.sauce.llc/legal/sauce4zwift-terms.html)
