# Interaction Checker for Google Meet

This very small python program helps you see who participated in your Google Meet sessions and how engaged everyone was.

## What It Does

Counts interactions from the transcript and exported chat, shows who participated, and creates simple charts to visualize meeting engagement.

## Setup

Clone the repo, and if you have python, you're set:

```
git clone https://github.com/waka-man/interaction_check.git
cd interaction_check
```

Edit the config file (config.json) with details like this:

```
{
    "transcript_file": "transcript.txt",
    "chat_file": "chat.txt",
    "teacher_name": "Your Name Here"
}
```

Put your transcript text file and the exported chat text file in the project directory.

## Usage

Run the script:

`python interaction_counter.py`

This will generate `output.json` with interaction details and non-participants.

To visualize the data, spin up a small web server with:

`python -m http.server 8000`

and head to localhost:8000 to see tha data

That's it! This should give you a quick idea of who spoke up and who stayed quiet during the meeting.
