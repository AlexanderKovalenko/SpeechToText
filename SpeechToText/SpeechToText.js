// ==UserScript==
// @name         SpeechToText
// @namespace    http://your.homepage/
// @version      0.1
// @description  enter something useful
// @author       You
// @match        https://isc.devexpress.com/*
// @match        https://codepen.io/pen/
// @grant        none
// ==/UserScript==

// Control phrase: "The issue occurs if you retrieve fixes for all known bugs. In code you can modify the sort order for .NET."

var iconGray = '<svg style="fill: gray" viewBox="0 0 24 25" width="24" height="24"><circle cx="12" cy="14" r="11"/></svg>';
var iconRed = '<svg style="fill: red" viewBox="0 0 24 25" width="24" height="24"><g><circle cx="12" cy="14" r="8"/><circle cx="12" cy="14" r="10" stroke="red" stroke-width="2" fill="none"/><animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/></g></svg>';

var replacements = {
    code: ["court", "coat"],
    illustrated: ["illustrated"],
    //test: ["a", "b"]
};

$(document).ready(function () {
    var isActive = false;
    var recognition = new webkitSpeechRecognition();
    var addedResultIndices = [];

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = "en-US";

    recognition.onresult = function (e) {
        for (var i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal && addedResultIndices.indexOf(i) == -1) {
                addedResultIndices.push(i);

                var lineBeforeCursor = getLineBeforeCursor();
                var isNewParagraph = !lineBeforeCursor;
                var isNewSentence = lineBeforeCursor.trimEnd().endsWith(".") || lineBeforeCursor.trimEnd().endsWith("?");
                var isNewPart = lineBeforeCursor.trimEnd().endsWith(",");
                var isColon = lineBeforeCursor.trimEnd().endsWith(":");
                var finalResult = e.results[i][0].transcript;

                if (isNewSentence || isNewParagraph)
                    finalResult = capitalize(finalResult);

                // Space after punctuation chars
                var prefix = ((isNewSentence || isNewPart || isColon) && !lineBeforeCursor.endsWith(" ")) ? " " : "";

                // Space before regular (non-punctuation) chars if next chars are not punctuation commands
                if (!isNewSentence && !isNewPart && !isColon && !lineBeforeCursor.endsWith(" ") && !finalResult.startsWith(" comma") && !finalResult.startsWith(" period") && !finalResult.startsWith(" colon"))
                    prefix = " ";

                if (isNewParagraph)
                    prefix = "";

                finalResult = finalResult.replace(/ comma/gi, ",").replace(/ period/gi, ".").replace(/ colon/gi, ":").replace(/ new line/gi, "\n");

                for (const target in replacements) {
                    for (const source of replacements[target]) {
                        finalResult = finalResult.replace(new RegExp(" " + source, "gi"), " " + target);
                    }
                }

                if (!finalResult.startsWith("\n"))
                    finalResult = finalResult.trimStart();
                else
                    finalResult = finalResult.replace(" ", "");

                if (finalResult == "backspace")
                    removeWordBeforeCursor();
                else
                    insertTextAtCursor(prefix + formatBold(finalResult));
            }
        }
    };

    recognition.onend = function (e) {
        isActive = false;
        btnRecording.innerHTML = iconGray;
    };

    recognition.onerror = function (e) {
        recognition.stop();
    };

    var btnRecording = document.createElement("button");

    btnRecording.title = "Start/stop speech to text recognition (CTRL+Click for alternate language).\nCommand words:\n'period', 'comma', 'colon' - Punctuation\n'new line' - Create a new line\n'backspace' - Remove the previous word\n'bold' - Apply bold to the previous word";
    btnRecording.style.padding = 0;
    btnRecording.style.position = "absolute";
    btnRecording.style.top = 0;
    btnRecording.style["z-index"] = 9999;
    btnRecording.innerHTML = iconGray;
    document.body.appendChild(btnRecording);

    btnRecording.addEventListener("click", e => {
        isActive = !isActive;
        btnRecording.innerHTML = isActive ? iconRed : iconGray;

        recognition.lang = !e.ctrlKey ? "en-US" : "ru";

        if (isActive) {
            addedResultIndices = [];
            recognition.start();
        }
        else {
            recognition.stop();
        }
    });

    function insertTextAtCursor(text) {
        var editor = $(".CodeMirror")[0].CodeMirror;
        var doc = editor.getDoc();
        var cursor = doc.getCursor();

        doc.replaceRange(text, cursor);
    }

    function getLineBeforeCursor() {
        var editor = $(".CodeMirror")[0].CodeMirror;
        var doc = editor.getDoc();
        var cursor = doc.getCursor();

        return doc.getLine(cursor.line).slice(0, cursor.ch);
    }

    function removeWordBeforeCursor() {
        var currentLine = getLineBeforeCursor();
        var editor = $(".CodeMirror")[0].CodeMirror;
        var doc = editor.getDoc();
        var cursor = doc.getCursor();
        var startIndex = 0;

        for (var i = currentLine.length - 2; i > 0; i--) {
            if (i == 1 || currentLine[i] == ' ') {
                startIndex = (i == 1 ? 0 : i);
                break;
            }
        }

        doc.replaceRange("", { line: cursor.line, ch: startIndex }, { line: cursor.line, ch: cursor.ch });
    }

    function capitalize(text) {
        if (text[0] != " ")
            return text[0].toUpperCase() + text.slice(1);
        else
            return " " + text[1].toUpperCase() + text.slice(2);
    }

    function formatBold(str) {
        var result = str.replace(/ bold/gi, "**").replace(/ bolt/gi, "**");
        var isBoldState = false;

        for (var i = result.length - 1; i > 0; i--) {
            if (result.substr(i, 2) == "**")
                isBoldState = true;

            if (isBoldState && (i == 1 || result[i - 1] == ' ')) {
                result = insertAt(result, i == 1 ? 0 : i, "**");
                isBoldState = false;
            }
        }

        return result;
    }

    function insertAt(str, index, str2) {
        return str.slice(0, index) + str2 + str.slice(index);
    }
});