# Dropsync

Simple command-line tool for synchronizing two directories (recursively).

I wrote Dropsync to fix an issue where I had been saving files to a Dropbox folder that was disconnected from Dropbox itself. So I had some changes in the real dropbox folder, and others in the orphaned one. By running this tool I could see which files had changed and either copy them over or merge them.

# Installation and Usage

1. `git clone https://github.com/alexch/dropsync.git`
1. `cd dropsync`
1. `npm install`
1. Edit `dropsync.js` (lines 17-18) with the desired paths.
1. `node dropsync`

# Output:

For each file that's different, it shows the name, status, size, mod date.
* `[**]` means the files are different
* `[<<]` means the file only exists on the left dir 
* `[<<]` means the file only exists on the right dir

It also shows a command to run to launch [Meld]() if you want to do a visual merge.

# Algorithm

Currently, if two files exist with the same path, it only compares file sizes. If the file sizes are different, then it considers (one or both of) the files to have been changed.

# Todo

* CLI (parameters for left and right dirs)
* inline diff
* scrolling console UI (using Blessed), with 'm' to launch merge tool on current file
* configurable merge tool
* verify file differences with a checksum, not just mtime
