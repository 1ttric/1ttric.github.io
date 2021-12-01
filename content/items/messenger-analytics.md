---
title: "Messenger Analytics"
description: "A statistical analysis of my main group chat"
date: 2021-12-01
tags: ["python", "statistics"]
---

I am part of a group chat that receives quite a bit of activity every day - given the hundreds of thousands of messages
sent, I figured there must be some interesting trends that have become apparent. The following is a brief analysis.

Do note that names have been reduced to initials for privacy's sake. You can probably still figure out that WV is yours truly 🙂

## Reaction likelihood

The first metric I was interested in viewing was a heatmap of the likelihood that one user will react to another user with a given emoji. But it's not quite that simple.

Some users, as a result of their natural gregariousness, will attract more *total* reactions, but perhaps not more *proportional* reactions.

And, similarly, some users are more predisposed to reacting than others - another factor which must be taken into consideration.

The matrix produced from each pair of possible user interactions has these two normalization options added, so you can view the data taking into consideration any of these confounding factors.

[Link](https://messenger-analysis.svc.vesey.tech/reactions)

## Message readability

Some users may be more predisposed to using fancy words in everyday messages.

In order to see whether this is true, I've run the standard Flesch–Kincaid readability metric across all user text.
Some additional interesting readability metrics are also included.

The results are displayed in a histogram for ease of viewing the *distribution* of a user's message readability.

[Link](https://messenger-analysis.svc.vesey.tech/readability)

## Time of day

The times during which users tend to send messages can suggest many different things, including:
* Work schedule
* Sleep hygiene
* Time zone
* University attendance

I've included a date slider to view how this metric changes over time. This visualization makes it easy to confirm when someone I know moves time zones!

[Link](https://messenger-analysis.svc.vesey.tech/timeofday)