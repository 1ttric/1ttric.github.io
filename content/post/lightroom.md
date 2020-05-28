---
title: "Adobe Lightroom as a hosted service?"
date: 2020-04-25
tags: ["windows", "adobe", "vnc", "linux", "docker"]
draft: false
---

# Background

As someone with a significant photo library, I often find myself wishing I could access old photos from the road.

Although remote file access softwares can let me dive through the basic directories, I often wish I could use my Adobe Lightroom Classic instance to sort and filter the photos so I can find the ones I am looking for without searching.

The problem is, however, most of the time I only have my phone on me - and Lightroom Classic is a Windows-only product.

My goal, then, is to host either a VM or container that will allow me to connect from any client to a Lightroom Classic instance that runs in the background on my local server.

# Windows

Windows would be the ideal candidate to run Lightroom-as-a-service, as it is, of course, a Windows app. The application would need to accomplish several things:

* Automatic starting

* A kiosk-style fullscreen view that disallows minimization or any shell interaction

* Lifecycle management (what happens when you close the app?)

However, Windows has Its Own Way Of Doing Things that is not always the easiest or most transparent.

## Exploring automatic application launch

Windows 10 allows a user account's launch permissions to be limited to one application. Furthermore, this application will be started automatically at login.

If you enable automatic login, you essentially get a virtual machine that will start up, enter the account of your choice, and run an app full-screen without any other apps visible or accessible.

There are three options to enable this feature, but each has caveats

1. Kiosk Mode
  This is the recommended method, but only works with UWP apps. A Classic app such as Lightroom will not work with this method.

2. Shell Launcher
  Allows a user's default shell to be changed via PowerShell commands. Includes nice lifecycle options so that if the custom shell exits, it can be automatically restarted.
  Seems to only work for UWP applications, and though reportedly one can work around this by targeting a PowerShell script that then chain-loads a non-UWP app, I only ever got black screens on login when attempting this.

3. Registry hacking
  This is perhaps the simplest and most reliable method, though it forfeits the lifecycle abilities of 2).
  A potential workaround is to write custom lifecycle logic with a PowerShell script and target that script as the custom shell.

    This is done by created a `Shell` key of type `REG_SZ` under the following registry path:

    `HKEY_CURRENT_USER\Software\Microsoft\Windows NT\CurrentVersion\Winlogon`

One of the above three methods would be paired well with various UI tweaks, for example, [disabling the boot screen](https://docs.microsoft.com/en-us/windows-hardware/customize/enterprise/unbranded-boot)

If the application is started as a shell, however, additional services would need to be configured in the background (namely, ZeroTier to provide intranet connectivity, and a VNC server to provide remote interactivity)

This involves more registry fiddling.

# Linux

The simplest course of action for Linux is to use a Windows compatability layer (WINE) to run the Windows app.

I routinely run my copy of Adobe Photoshop via WINE, but Lightroom Classic is more finicky and prone to crashes.

Getting the correct incantation to make the software work will be made easier by preparing a Docker image to run Lightroom in a known and reproducible environment.

## Catalog handling

A Lightroom catalog consists of an `.lrcat` file (actually a SQLite database) and various helper folders with suffixes such as `.lrdata`

The only *mandatory* file here is the catalog itself. The data directories merely serve as a cache to speed up the loading of thumbnails and other data.

So, it should be simple just to bind mount in a directory containing the catalog file and run the app with WINE? Nope.

Although Lightroom allows for the loading of images from a networked or otherwise mounted drive, the catalog file itself **must** be located on the host's main volume. This is likely for performance reasons - imagine running a SQLite database
backed by a highly latent NAS Samba share. Not a use case that needs support.

Crucially, **this limitation holds while executing the program under WINE.**

So, then - inside the container, the catalog cannot be run directly from a bind mounted directory. That's a problem, but a solvable one.

### Catalog copying

It isn't a solution to build the catalog into the Dockerfile itself - I need the ability to execute any arbitrary catalog without having to roll a custom Dockerfile.

Copying the catalog *FROM* a bind-mounted directory is the most obvious solution. My personal catalog is 307MB at 40,000 media files - so scalability doesn't seem like a glaring issue.

The file will need to be copied from its mounted directory before application start, and written back upon application end (and ideally, continuously every time the user makes a change).
The naive approach here would be to write a watchdog that continuously monitors the two directories in question and syncs any changes. But busy-looping isn't very elegant.

Luckily, there are file-system level tools I can use! **Inotify** is a Linux kernel feature that allows for monitoring filesystem *inodes* (files or directories) for changes, and notifying any user-registered callbacks of the update.
In this manner, two directories can be kept continuously in sync by manually copying over any changes when a signal is received that changes have occurred.

Rather than write my own utility to perform this duty, I chose to use [Unison](https://github.com/bcpierce00/unison).

## The Dockerfile

### Requirements

The specific runtime libraries required by Lightroom Classic 

