import { useState, useMemo, useRef, useEffect, memo, useCallback } from "react";

// Build stamp — __BUILD__ is replaced at deploy time (esbuild --define); falls back to 'dev build' in the artifact preview.
const BUILD_INFO = (typeof __BUILD__ !== "undefined") ? __BUILD__ : null;
// Telemetry relay URL (a Cloud Function that forwards reports to a GitHub repo Claude can read). Empty = autonomous send off; the in-app copy-to-clipboard still works.
const LOG_ENDPOINT = "";

// Embedded piece graphics (cburnett set)
const PIECE_IMG = {
"wk": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSA0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIGQ9Ik0yMi41IDExLjYzVjZNMjAgOGg1Ii8+PHBhdGggZmlsbD0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIGQ9Ik0yMi41IDI1czQuNS03LjUgMy0xMC41YzAgMC0xLTIuNS0zLTIuNXMtMyAyLjUtMyAyLjVjLTEuNSAzIDMgMTAuNSAzIDEwLjUiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTEuNSAzN2M1LjUgMy41IDE1LjUgMy41IDIxIDB2LTdzOS00LjUgNi0xMC41Yy00LTYuNS0xMy41LTMuNS0xNiA0VjI3di0zLjVjLTMuNS03LjUtMTMtMTAuNS0xNi00LTMgNiA1IDEwIDUgMTB6Ii8+PHBhdGggZD0iTTExLjUgMzBjNS41LTMgMTUuNS0zIDIxIDBtLTIxIDMuNWM1LjUtMyAxNS41LTMgMjEgMG0tMjEgMy41YzUuNS0zIDE1LjUtMyAyMSAwIi8+PC9nPjwvc3ZnPg==",
"wq": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSA0NSI+PGcgZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGQ9Ik04IDEyYTIgMiAwIDEgMS00IDAgMiAyIDAgMSAxIDQgMG0xNi41LTQuNWEyIDIgMCAxIDEtNCAwIDIgMiAwIDEgMSA0IDBNNDEgMTJhMiAyIDAgMSAxLTQgMCAyIDIgMCAxIDEgNCAwTTE2IDguNWEyIDIgMCAxIDEtNCAwIDIgMiAwIDEgMSA0IDBNMzMgOWEyIDIgMCAxIDEtNCAwIDIgMiAwIDEgMSA0IDAiLz48cGF0aCBzdHJva2UtbGluZWNhcD0iYnV0dCIgZD0iTTkgMjZjOC41LTEuNSAyMS0xLjUgMjcgMGwyLTEyLTcgMTFWMTFsLTUuNSAxMy41LTMtMTUtMyAxNS01LjUtMTRWMjVMNyAxNHoiLz48cGF0aCBzdHJva2UtbGluZWNhcD0iYnV0dCIgZD0iTTkgMjZjMCAyIDEuNSAyIDIuNSA0IDEgMS41IDEgMSAuNSAzLjUtMS41IDEtMS41IDIuNS0xLjUgMi41LTEuNSAxLjUuNSAyLjUuNSAyLjUgNi41IDEgMTYuNSAxIDIzIDAgMCAwIDEuNS0xIDAtMi41IDAgMCAuNS0xLjUtMS0yLjUtLjUtMi41LS41LTIgLjUtMy41IDEtMiAyLjUtMiAyLjUtNC04LjUtMS41LTE4LjUtMS41LTI3IDB6Ii8+PHBhdGggZmlsbD0ibm9uZSIgZD0iTTExLjUgMzBjMy41LTEgMTguNS0xIDIyIDBNMTIgMzMuNWM2LTEgMTUtMSAyMSAwIi8+PC9nPjwvc3ZnPg==",
"wr": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSA0NSI+PGcgZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJidXR0IiBkPSJNOSAzOWgyN3YtM0g5em0zLTN2LTRoMjF2NHptLTEtMjJWOWg0djJoNVY5aDV2Mmg1VjloNHY1Ii8+PHBhdGggZD0ibTM0IDE0LTMgM0gxNGwtMy0zIi8+PHBhdGggc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIGQ9Ik0zMSAxN3YxMi41SDE0VjE3Ii8+PHBhdGggZD0ibTMxIDI5LjUgMS41IDIuNWgtMjBsMS41LTIuNSIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIGQ9Ik0xMSAxNGgyMyIvPjwvZz48L3N2Zz4=",
"wb": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSA0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxnIGZpbGw9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJidXR0Ij48cGF0aCBkPSJNOSAzNmMzLjM5LS45NyAxMC4xMS40MyAxMy41LTIgMy4zOSAyLjQzIDEwLjExIDEuMDMgMTMuNSAyIDAgMCAxLjY1LjU0IDMgMi0uNjguOTctMS42NS45OS0zIC41LTMuMzktLjk3LTEwLjExLjQ2LTEzLjUtMS0zLjM5IDEuNDYtMTAuMTEuMDMtMTMuNSAxLTEuMzUuNDktMi4zMi40Ny0zLS41IDEuMzUtMS45NCAzLTIgMy0yeiIvPjxwYXRoIGQ9Ik0xNSAzMmMyLjUgMi41IDEyLjUgMi41IDE1IDAgLjUtMS41IDAtMiAwLTIgMC0yLjUtMi41LTQtMi41LTQgNS41LTEuNSA2LTExLjUtNS0xNS41LTExIDQtMTAuNSAxNC01IDE1LjUgMCAwLTIuNSAxLjUtMi41IDQgMCAwLS41LjUgMCAyeiIvPjxwYXRoIGQ9Ik0yNSA4YTIuNSAyLjUgMCAxIDEtNSAwIDIuNSAyLjUgMCAxIDEgNSAweiIvPjwvZz48cGF0aCBzdHJva2UtbGluZWpvaW49Im1pdGVyIiBkPSJNMTcuNSAyNmgxME0xNSAzMGgxNW0tNy41LTE0LjV2NU0yMCAxOGg1Ii8+PC9nPjwvc3ZnPg==",
"wn": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSA0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0yMiAxMGMxMC41IDEgMTYuNSA4IDE2IDI5SDE1YzAtOSAxMC02LjUgOC0yMSIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0yNCAxOGMuMzggMi45MS01LjU1IDcuMzctOCA5LTMgMi0yLjgyIDQuMzQtNSA0LTEuMDQyLS45NCAxLjQxLTMuMDQgMC0zLTEgMCAuMTkgMS4yMy0xIDItMSAwLTQuMDAzIDEtNC00IDAtMiA2LTEyIDYtMTJzMS44OS0xLjkgMi0zLjVjLS43My0uOTk0LS41LTItLjUtMyAxLTEgMyAyLjUgMyAyLjVoMnMuNzgtMS45OTIgMi41LTNjMSAwIDEgMyAxIDMiLz48cGF0aCBmaWxsPSIjMDAwIiBkPSJNOS41IDI1LjVhLjUuNSAwIDEgMS0xIDAgLjUuNSAwIDEgMSAxIDBtNS40MzMtOS43NWEuNSAxLjUgMzAgMSAxLS44NjYtLjUuNSAxLjUgMzAgMSAxIC44NjYuNSIvPjwvZz48L3N2Zz4=",
"wp": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSA0NSI+PHBhdGggZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41IiBkPSJNMjIuNSA5Yy0yLjIxIDAtNCAxLjc5LTQgNCAwIC44OS4yOSAxLjcxLjc4IDIuMzhDMTcuMzMgMTYuNSAxNiAxOC41OSAxNiAyMWMwIDIuMDMuOTQgMy44NCAyLjQxIDUuMDMtMyAxLjA2LTcuNDEgNS41NS03LjQxIDEzLjQ3aDIzYzAtNy45Mi00LjQxLTEyLjQxLTcuNDEtMTMuNDcgMS40Ny0xLjE5IDIuNDEtMyAyLjQxLTUuMDMgMC0yLjQxLTEuMzMtNC41LTMuMjgtNS42Mi40OS0uNjcuNzgtMS40OS43OC0yLjM4IDAtMi4yMS0xLjc5LTQtNC00eiIvPjwvc3ZnPg==",
"bk": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSA0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIGQ9Ik0yMi41IDExLjZWNiIvPjxwYXRoIGZpbGw9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJidXR0IiBzdHJva2UtbGluZWpvaW49Im1pdGVyIiBkPSJNMjIuNSAyNXM0LjUtNy41IDMtMTAuNWMwIDAtMS0yLjUtMy0yLjVzLTMgMi41LTMgMi41Yy0xLjUgMyAzIDEwLjUgMyAxMC41Ii8+PHBhdGggZmlsbD0iIzAwMCIgZD0iTTExLjUgMzdhMjIuMyAyMi4zIDAgMCAwIDIxIDB2LTdzOS00LjUgNi0xMC41Yy00LTYuNS0xMy41LTMuNS0xNiA0VjI3di0zLjVjLTMuNS03LjUtMTMtMTAuNS0xNi00LTMgNiA1IDEwIDUgMTB6Ii8+PHBhdGggc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgZD0iTTIwIDhoNSIvPjxwYXRoIHN0cm9rZT0iI2VjZWNlYyIgZD0iTTMyIDI5LjVzOC41LTQgNi05LjdDMzQuMSAxNCAyNSAxOCAyMi41IDI0LjZ2Mi4xLTIuMUMyMCAxOCA5LjkgMTQgNyAxOS45Yy0yLjUgNS42IDQuOCA5IDQuOCA5Ii8+PHBhdGggc3Ryb2tlPSIjZWNlY2VjIiBkPSJNMTEuNSAzMGM1LjUtMyAxNS41LTMgMjEgMG0tMjEgMy41YzUuNS0zIDE1LjUtMyAyMSAwbS0yMSAzLjVjNS41LTMgMTUuNS0zIDIxIDAiLz48L2c+PC9zdmc+",
"bq": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSA0NSI+PGcgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxnIHN0cm9rZT0ibm9uZSI+PGNpcmNsZSBjeD0iNiIgY3k9IjEyIiByPSIyLjc1Ii8+PGNpcmNsZSBjeD0iMTQiIGN5PSI5IiByPSIyLjc1Ii8+PGNpcmNsZSBjeD0iMjIuNSIgY3k9IjgiIHI9IjIuNzUiLz48Y2lyY2xlIGN4PSIzMSIgY3k9IjkiIHI9IjIuNzUiLz48Y2lyY2xlIGN4PSIzOSIgY3k9IjEyIiByPSIyLjc1Ii8+PC9nPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJidXR0IiBkPSJNOSAyNmM4LjUtMS41IDIxLTEuNSAyNyAwbDIuNS0xMi41TDMxIDI1bC0uMy0xNC4xLTUuMiAxMy42LTMtMTQuNS0zIDE0LjUtNS4yLTEzLjZMMTQgMjUgNi41IDEzLjV6Ii8+PHBhdGggc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIGQ9Ik05IDI2YzAgMiAxLjUgMiAyLjUgNCAxIDEuNSAxIDEgLjUgMy41LTEuNSAxLTEuNSAyLjUtMS41IDIuNS0xLjUgMS41LjUgMi41LjUgMi41IDYuNSAxIDE2LjUgMSAyMyAwIDAgMCAxLjUtMSAwLTIuNSAwIDAgLjUtMS41LTEtMi41LS41LTIuNS0uNS0yIC41LTMuNSAxLTIgMi41LTIgMi41LTQtOC41LTEuNS0xOC41LTEuNS0yNyAweiIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJidXR0IiBkPSJNMTEgMzguNWEzNSAzNSAxIDAgMCAyMyAwIi8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZWNlY2VjIiBkPSJNMTEgMjlhMzUgMzUgMSAwIDEgMjMgMG0tMjEuNSAyLjVoMjBtLTIxIDNhMzUgMzUgMSAwIDAgMjIgMG0tMjMgM2EzNSAzNSAxIDAgMCAyNCAwIi8+PC9nPjwvc3ZnPg==",
"br": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSA0NSI+PGcgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJidXR0IiBkPSJNOSAzOWgyN3YtM0g5em0zLjUtNyAxLjUtMi41aDE3bDEuNSAyLjV6bS0uNSA0di00aDIxdjR6Ii8+PHBhdGggc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIGQ9Ik0xNCAyOS41di0xM2gxN3YxM3oiLz48cGF0aCBzdHJva2UtbGluZWNhcD0iYnV0dCIgZD0iTTE0IDE2LjUgMTEgMTRoMjNsLTMgMi41ek0xMSAxNFY5aDR2Mmg1VjloNXYyaDVWOWg0djV6Ii8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZWNlY2VjIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIiBzdHJva2Utd2lkdGg9IjEiIGQ9Ik0xMiAzNS41aDIxbS0yMC00aDE5bS0xOC0yaDE3bS0xNy0xM2gxN00xMSAxNGgyMyIvPjwvZz48L3N2Zz4=",
"bb": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSA0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxnIGZpbGw9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJidXR0Ij48cGF0aCBkPSJNOSAzNmMzLjQtMSAxMC4xLjQgMTMuNS0yIDMuNCAyLjQgMTAuMSAxIDEzLjUgMiAwIDAgMS42LjUgMyAyLS43IDEtMS42IDEtMyAuNS0zLjQtMS0xMC4xLjUtMTMuNS0xLTMuNCAxLjUtMTAuMSAwLTEzLjUgMS0xLjQuNS0yLjMuNS0zLS41IDEuNC0yIDMtMiAzLTJ6Ii8+PHBhdGggZD0iTTE1IDMyYzIuNSAyLjUgMTIuNSAyLjUgMTUgMCAuNS0xLjUgMC0yIDAtMiAwLTIuNS0yLjUtNC0yLjUtNCA1LjUtMS41IDYtMTEuNS01LTE1LjUtMTEgNC0xMC41IDE0LTUgMTUuNSAwIDAtMi41IDEuNS0yLjUgNCAwIDAtLjUuNSAwIDJ6Ii8+PHBhdGggZD0iTTI1IDhhMi41IDIuNSAwIDEgMS01IDAgMi41IDIuNSAwIDEgMSA1IDB6Ii8+PC9nPjxwYXRoIHN0cm9rZT0iI2VjZWNlYyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgZD0iTTE3LjUgMjZoMTBNMTUgMzBoMTVtLTcuNS0xNC41djVNMjAgMThoNSIvPjwvZz48L3N2Zz4=",
"bn": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSA0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGZpbGw9IiMwMDAiIGQ9Ik0yMiAxMGMxMC41IDEgMTYuNSA4IDE2IDI5SDE1YzAtOSAxMC02LjUgOC0yMSIvPjxwYXRoIGZpbGw9IiMwMDAiIGQ9Ik0yNCAxOGMuMzggMi45MS01LjU1IDcuMzctOCA5LTMgMi0yLjgyIDQuMzQtNSA0LTEuMDQtLjk0IDEuNDEtMy4wNCAwLTMtMSAwIC4xOSAxLjIzLTEgMi0xIDAtNCAxLTQtNCAwLTIgNi0xMiA2LTEyczEuODktMS45IDItMy41Yy0uNzMtMS0uNS0yLS41LTMgMS0xIDMgMi41IDMgMi41aDJzLjc4LTIgMi41LTNjMSAwIDEgMyAxIDMiLz48cGF0aCBmaWxsPSIjZWNlY2VjIiBzdHJva2U9IiNlY2VjZWMiIGQ9Ik05LjUgMjUuNWEuNS41IDAgMSAxLTEgMCAuNS41IDAgMSAxIDEgMG01LjQzLTkuNzVhLjUgMS41IDMwIDEgMS0uODYtLjUuNSAxLjUgMzAgMSAxIC44Ni41Ii8+PHBhdGggZmlsbD0iI2VjZWNlYyIgc3Ryb2tlPSJub25lIiBkPSJtMjQuNTUgMTAuNC0uNDUgMS40NS41LjE1YzMuMTUgMSA1LjY1IDIuNDkgNy45IDYuNzVTMzUuNzUgMjkuMDYgMzUuMjUgMzlsLS4wNS41aDIuMjVsLjA1LS41Yy41LTEwLjA2LS44OC0xNi44NS0zLjI1LTIxLjM0cy01Ljc5LTYuNjQtOS4xOS03LjE2eiIvPjwvZz48L3N2Zz4=",
"bp": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSA0NSI+PHBhdGggc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41IiBkPSJNMjIuNSA5YTQgNCAwIDAgMC0zLjIyIDYuMzggNi40OCA2LjQ4IDAgMCAwLS44NyAxMC42NWMtMyAxLjA2LTcuNDEgNS41NS03LjQxIDEzLjQ3aDIzYzAtNy45Mi00LjQxLTEyLjQxLTcuNDEtMTMuNDdhNi40NiA2LjQ2IDAgMCAwLS44Ny0xMC42NUE0LjAxIDQuMDEgMCAwIDAgMjIuNSA5eiIvPjwvc3ZnPg=="
};
// ═══════════════════════════════════════════════════════════════
//  CHESS ENGINE
// ═══════════════════════════════════════════════════════════════
const FILES='abcdefgh';
const rc2sq=(r,c)=>FILES[c]+(8-r);
const inB=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const opp=c=>c==='w'?'b':'w';
function initBoard(){const b=Array(8).fill(null).map(()=>Array(8).fill(null));const bk=['r','n','b','q','k','b','n','r'];for(let c=0;c<8;c++){b[0][c]={t:bk[c],c:'b'};b[7][c]={t:bk[c],c:'w'};b[1][c]={t:'p',c:'b'};b[6][c]={t:'p',c:'w'};}return b;}
const cloneB=b=>b.map(r=>r.map(s=>s?{...s}:null));
function initGame(){return{board:initBoard(),turn:'w',castling:{wK:true,wQ:true,bK:true,bQ:true},ep:null,history:[]};}
function fromFEN(fen){const parts=String(fen||'').trim().split(/\s+/);const rows=(parts[0]||'').split('/');const board=Array(8).fill(null).map(()=>Array(8).fill(null));for(let r=0;r<8;r++){let c=0;for(const ch of (rows[r]||'')){if(/[1-8]/.test(ch)){c+=+ch;}else if(c<8){board[r][c]={t:ch.toLowerCase(),c:(ch===ch.toUpperCase())?'w':'b'};c++;}}}const turn=parts[1]==='b'?'b':'w';const cs=parts[2]||'-';return{board,turn,castling:{wK:cs.includes('K'),wQ:cs.includes('Q'),bK:cs.includes('k'),bQ:cs.includes('q')},ep:(parts[3]&&parts[3]!=='-'&&parts[3].length>=2)?[8-(+parts[3][1]),FILES.indexOf(parts[3][0])]:null,history:[]};}
function toFEN(game){const rows=[];for(let r=0;r<8;r++){let row='',empty=0;for(let c=0;c<8;c++){const p=game.board[r][c];if(p){if(empty){row+=empty;empty=0;}row+=p.c==='w'?p.t.toUpperCase():p.t;}else empty++;}if(empty)row+=empty;rows.push(row);}const cs=[game.castling.wK?'K':'',game.castling.wQ?'Q':'',game.castling.bK?'k':'',game.castling.bQ?'q':''].join('')||'-';const ep=game.ep?FILES[game.ep[1]]+(8-game.ep[0]):'-';return rows.join('/')+' '+game.turn+' '+cs+' '+ep+' 0 1';}
// Net material from White's point of view, in standard points (pawn 1, N/B 3, R 5, Q 9). Positive = White ahead.
function materialDiff(board){const v={p:1,n:3,b:3,r:5,q:9,k:0};let s=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(p)s+=(p.c==='w'?1:-1)*v[p.t];}return s;}
function capturedList(board){const full={p:8,n:2,b:2,r:2,q:1};const cnt={w:{p:0,n:0,b:0,r:0,q:0},b:{p:0,n:0,b:0,r:0,q:0}};for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(p&&p.t!=='k'&&cnt[p.c])cnt[p.c][p.t]++;}const mk=(side)=>{const o=side==='w'?'b':'w';const a=[];['q','r','b','n','p'].forEach(t=>{const miss=full[t]-cnt[o][t];for(let i=0;i<miss;i++)a.push(t);});return a;};return {w:mk('w'),b:mk('b')};}
// Player-facing material readout. tone: good/bad (vs computer), lead (vs human), neutral (even).
function materialLabel(board,opponent,pColor){const md=materialDiff(board);if(opponent==='computer'){const pl=pColor==='w'?md:-md;return{text:pl>0?`You're up ${pl}`:pl<0?`You're down ${-pl}`:'Material even',tone:pl>0?'good':pl<0?'bad':'neutral',diff:md};}return{text:md>0?`White +${md}`:md<0?`Black +${-md}`:'Material even',tone:md!==0?'lead':'neutral',diff:md};}
function isAttacked(board,r,c,by){
  for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const nr=r+dr,nc=c+dc;if(inB(nr,nc)&&board[nr][nc]?.t==='n'&&board[nr][nc]?.c===by)return true;}
  for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){let nr=r+dr,nc=c+dc;while(inB(nr,nc)){const p=board[nr][nc];if(p){if(p.c===by&&(p.t==='r'||p.t==='q'))return true;break;}nr+=dr;nc+=dc;}}
  for(const[dr,dc]of[[-1,-1],[-1,1],[1,-1],[1,1]]){let nr=r+dr,nc=c+dc;while(inB(nr,nc)){const p=board[nr][nc];if(p){if(p.c===by&&(p.t==='b'||p.t==='q'))return true;break;}nr+=dr;nc+=dc;}}
  for(const[dr,dc]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){const nr=r+dr,nc=c+dc;if(inB(nr,nc)&&board[nr][nc]?.t==='k'&&board[nr][nc]?.c===by)return true;}
  const pd=by==='w'?1:-1;for(const dc of[-1,1]){const nr=r+pd,nc=c+dc;if(inB(nr,nc)&&board[nr][nc]?.t==='p'&&board[nr][nc]?.c===by)return true;}
  return false;
}
function findKing(board,color){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.t==='k'&&board[r][c]?.c===color)return[r,c];return null;}
const isInCheck=(board,color)=>{const k=findKing(board,color);return k?isAttacked(board,k[0],k[1],opp(color)):false;};
function pseudoMoves(game,r,c){
  const{board,ep}=game;const p=board[r][c];if(!p)return[];const{t,c:color}=p;const enemy=opp(color);const moves=[];
  const push=(tr,tc,x={})=>{if(!inB(tr,tc)||board[tr][tc]?.c===color)return;moves.push({fr:r,fc:c,tr,tc,...x});};
  const slide=(dr,dc)=>{let tr=r+dr,tc=c+dc;while(inB(tr,tc)){const s=board[tr][tc];if(s){if(s.c!==color)moves.push({fr:r,fc:c,tr,tc});break;}moves.push({fr:r,fc:c,tr,tc});tr+=dr;tc+=dc;}};
  if(t==='p'){const dir=color==='w'?-1:1,start=color==='w'?6:1,prow=color==='w'?0:7;
    if(inB(r+dir,c)&&!board[r+dir][c]){if(r+dir===prow){for(const pt of['q','r','b','n'])moves.push({fr:r,fc:c,tr:r+dir,tc:c,promo:pt});}else{moves.push({fr:r,fc:c,tr:r+dir,tc:c});if(r===start&&!board[r+2*dir][c])moves.push({fr:r,fc:c,tr:r+2*dir,tc:c,dp:true});}}
    for(const dc of[-1,1]){const tr=r+dir,tc=c+dc;if(!inB(tr,tc))continue;if(board[tr][tc]?.c===enemy){if(tr===prow){for(const pt of['q','r','b','n'])moves.push({fr:r,fc:c,tr,tc,promo:pt});}else moves.push({fr:r,fc:c,tr,tc});}if(ep&&tr===ep[0]&&tc===ep[1])moves.push({fr:r,fc:c,tr,tc,epCap:true});}}
  if(t==='n'){for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])push(r+dr,c+dc);}
  if(t==='b'||t==='q'){for(const[dr,dc]of[[-1,-1],[-1,1],[1,-1],[1,1]])slide(dr,dc);}
  if(t==='r'||t==='q'){for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]])slide(dr,dc);}
  if(t==='k'){for(const[dr,dc]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])push(r+dr,c+dc);}
  return moves;
}
function applyMove(board,move){const nb=cloneB(board);const piece=nb[move.fr][move.fc];nb[move.tr][move.tc]=move.promo?{t:move.promo,c:piece.c}:{...piece};nb[move.fr][move.fc]=null;if(move.epCap)nb[move.fr][move.tc]=null;if(move.castle==='K'){nb[move.tr][5]=nb[move.tr][7];nb[move.tr][7]=null;}if(move.castle==='Q'){nb[move.tr][3]=nb[move.tr][0];nb[move.tr][0]=null;}return nb;}
function getLegal(game){
  const{board,turn,castling}=game;const legal=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    if(board[r][c]?.c!==turn)continue;
    for(const mv of pseudoMoves(game,r,c)){const nb=applyMove(board,mv);if(!isInCheck(nb,turn))legal.push(mv);}
    if(board[r][c].t==='k'&&!isInCheck(board,turn)){
      if(turn==='w'&&r===7&&c===4){if(castling.wK&&board[7][7]?.t==='r'&&board[7][7]?.c==='w'&&!board[7][5]&&!board[7][6]&&!isAttacked(board,7,5,'b')&&!isAttacked(board,7,6,'b'))legal.push({fr:7,fc:4,tr:7,tc:6,castle:'K'});if(castling.wQ&&board[7][0]?.t==='r'&&board[7][0]?.c==='w'&&!board[7][1]&&!board[7][2]&&!board[7][3]&&!isAttacked(board,7,3,'b')&&!isAttacked(board,7,2,'b'))legal.push({fr:7,fc:4,tr:7,tc:2,castle:'Q'});}
      if(turn==='b'&&r===0&&c===4){if(castling.bK&&board[0][7]?.t==='r'&&board[0][7]?.c==='b'&&!board[0][5]&&!board[0][6]&&!isAttacked(board,0,5,'w')&&!isAttacked(board,0,6,'w'))legal.push({fr:0,fc:4,tr:0,tc:6,castle:'K'});if(castling.bQ&&board[0][0]?.t==='r'&&board[0][0]?.c==='b'&&!board[0][1]&&!board[0][2]&&!board[0][3]&&!isAttacked(board,0,3,'w')&&!isAttacked(board,0,2,'w'))legal.push({fr:0,fc:4,tr:0,tc:2,castle:'Q'});}
    }
  }
  return legal;
}
function getMovesFrom(game,r,c){return getLegal(game).filter(m=>m.fr===r&&m.fc===c);}
function disambig(game,move){
  const piece=game.board[move.fr][move.fc];if(piece.t==='p'||piece.t==='k')return'';
  const others=getLegal(game).filter(m=>m.tr===move.tr&&m.tc===move.tc&&!(m.fr===move.fr&&m.fc===move.fc)&&game.board[m.fr][m.fc]?.t===piece.t);
  if(others.length===0)return'';
  const sameFile=others.some(m=>m.fc===move.fc),sameRank=others.some(m=>m.fr===move.fr);
  if(!sameFile)return FILES[move.fc];if(!sameRank)return String(8-move.fr);return FILES[move.fc]+(8-move.fr);
}
function toSAN(game,move,nb){const piece=game.board[move.fr][move.fc];if(move.castle==='K')return'O-O';if(move.castle==='Q')return'O-O-O';const tgt=rc2sq(move.tr,move.tc);const isCap=!!game.board[move.tr][move.tc]||move.epCap;const chk=isInCheck(nb,opp(piece.c));let san='';if(piece.t==='p'){if(isCap)san=FILES[move.fc]+'x';san+=tgt;if(move.promo)san+='='+move.promo.toUpperCase();}else{san=piece.t.toUpperCase()+disambig(game,move);if(isCap)san+='x';san+=tgt;}san+=chk?'+':'';return san;}
function makeMove(game,move){
  const piece=game.board[move.fr][move.fc];const nb=applyMove(game.board,move);const dir=piece?.c==='w'?-1:1;
  const ca={...game.castling};
  if(piece?.t==='k'){if(piece.c==='w'){ca.wK=ca.wQ=false;}else{ca.bK=ca.bQ=false;}}
  if(piece?.t==='r'){if(move.fr===7&&move.fc===7)ca.wK=false;if(move.fr===7&&move.fc===0)ca.wQ=false;if(move.fr===0&&move.fc===7)ca.bK=false;if(move.fr===0&&move.fc===0)ca.bQ=false;}
  if(move.tr===7&&move.tc===7)ca.wK=false;if(move.tr===7&&move.tc===0)ca.wQ=false;if(move.tr===0&&move.tc===7)ca.bK=false;if(move.tr===0&&move.tc===0)ca.bQ=false;
  const nextTurn=opp(game.turn);const newEP=move.dp?[move.fr+dir,move.fc]:null;
  const next={board:nb,turn:nextTurn,castling:ca,ep:newEP,history:game.history};
  let san=toSAN(game,move,nb);
  const nL=getLegal(next);if(isInCheck(nb,nextTurn)&&nL.length===0)san=san.replace(/\+$/,'#');
  return{...next,history:[...game.history,{san,move}]};
}
function getStatus(game){const l=getLegal(game);const chk=isInCheck(game.board,game.turn);if(l.length===0)return chk?'checkmate':'stalemate';return chk?'check':'playing';}

// ═══════════════════════════════════════════════════════════════
//  AI  — minimax + alpha-beta, piece-square evaluation
// ═══════════════════════════════════════════════════════════════
const VAL={p:100,n:320,b:330,r:500,q:900,k:0};
const PST={
  p:[0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  n:[-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b:[-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r:[0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q:[-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k:[-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
};
function evaluate(board){
  let s=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=board[r][c];if(!p)continue;
    const base=VAL[p.t];const pst=PST[p.t][p.c==='w'?r*8+c:(7-r)*8+c];
    if(p.c==='w')s+=base+pst;else s-=base+pst;
  }
  return s;
}
function makeFast(game,move){
  const piece=game.board[move.fr][move.fc];const nb=applyMove(game.board,move);const dir=piece?.c==='w'?-1:1;
  const ca={...game.castling};
  if(piece?.t==='k'){if(piece.c==='w'){ca.wK=ca.wQ=false;}else{ca.bK=ca.bQ=false;}}
  if(piece?.t==='r'){if(move.fr===7&&move.fc===7)ca.wK=false;if(move.fr===7&&move.fc===0)ca.wQ=false;if(move.fr===0&&move.fc===7)ca.bK=false;if(move.fr===0&&move.fc===0)ca.bQ=false;}
  return{board:nb,turn:opp(game.turn),castling:ca,ep:move.dp?[move.fr+dir,move.fc]:null,history:game.history};
}
function orderMoves(game,moves){
  return moves.map(m=>{const victim=game.board[m.tr][m.tc];const att=game.board[m.fr][m.fc];let sc=0;if(victim)sc=10*VAL[victim.t]-VAL[att.t];if(m.promo)sc+=800;return{m,sc};}).sort((a,b)=>b.sc-a.sc).map(x=>x.m);
}
var QDEPTH=2;
function quiesce(game,alpha,beta,maxing,qd){
  const standPat=evaluate(game.board);
  if(maxing){if(standPat>=beta)return beta;if(standPat>alpha)alpha=standPat;}
  else{if(standPat<=alpha)return alpha;if(standPat<beta)beta=standPat;}
  if(qd<=0)return maxing?alpha:beta;
  const caps=getLegal(game).filter(m=>game.board[m.tr][m.tc]||m.epCap||m.promo);
  for(const m of orderMoves(game,caps)){
    const v=quiesce(makeFast(game,m),alpha,beta,!maxing,qd-1);
    if(maxing){if(v>alpha)alpha=v;if(alpha>=beta)return beta;}
    else{if(v<beta)beta=v;if(beta<=alpha)return alpha;}
  }
  return maxing?alpha:beta;
}
function minimax(game,depth,alpha,beta,maxing){
  if(depth===0)return quiesce(game,alpha,beta,maxing,QDEPTH);
  const moves=getLegal(game);
  if(moves.length===0)return isInCheck(game.board,game.turn)?(maxing?-99999+(10-depth):99999-(10-depth)):0;
  const ordered=orderMoves(game,moves);
  if(maxing){let best=-Infinity;for(const m of ordered){const v=minimax(makeFast(game,m),depth-1,alpha,beta,false);if(v>best)best=v;if(v>alpha)alpha=v;if(beta<=alpha)break;}return best;}
  else{let best=Infinity;for(const m of ordered){const v=minimax(makeFast(game,m),depth-1,alpha,beta,true);if(v<best)best=v;if(v<beta)beta=v;if(beta<=alpha)break;}return best;}
}
// Small per-style preference (centipawns), used only to break ties among near-equal moves so a bot's
// minor inaccuracies lean toward its personality. Never large enough to choose an actual blunder.
function styleBias(game,m,style){
  if(!style||style==='balanced')return 0;
  const pc=game.board[m.fr][m.fc];if(!pc)return 0;
  const cap=!!game.board[m.tr][m.tc]||m.epCap;
  const central=1-((Math.abs(3.5-m.tr)+Math.abs(3.5-m.tc))/7);
  const adv=pc.c==='w'?(m.fr-m.tr):(m.tr-m.fr);
  let s=0;
  if(style==='attack'){if(cap)s+=20;if(adv>0)s+=5*adv;s+=9*central;if(pc.t==='q'||pc.t==='r')s+=3;}
  else if(style==='solid'){if(m.castle)s+=24;if(!cap)s+=7;s+=5*central;if(pc.t==='q'&&adv>1)s-=12;if(pc.t==='p'&&adv>=2)s-=3;}
  else if(style==='positional'){if(m.castle)s+=18;if(pc.t==='n'||pc.t==='b')s+=9*central;s+=7*central;if(cap)s-=2;}
  return s;
}
function bestMove(game,depth,randomness=0,style='balanced'){
  const moves=getLegal(game);if(moves.length===0)return null;
  const maxing=game.turn==='w';
  const ordered=orderMoves(game,moves);
  let scored=ordered.map(m=>{const v=minimax(makeFast(game,m),depth-1,-Infinity,Infinity,!maxing);const sb=styleBias(game,m,style);return{m,v:v+(Math.random()-0.5)*randomness+(maxing?sb:-sb)};});
  scored.sort((a,b)=>maxing?b.v-a.v:a.v-b.v);
  return scored[0].m;
}
// Evaluation in pawns from White's POV, for the analysis bar
function evalPawns(game){
  const st=getStatus(game);
  if(st==='checkmate')return game.turn==='w'?-99:99;
  if(st==='stalemate')return 0;
  return Math.max(-99,Math.min(99,evaluate(game.board)/100));
}
// ═══════════════════════════════════════════════════════════════
//  OPENING LIBRARY  — main lines, variations, gambits + traps
// ═══════════════════════════════════════════════════════════════
const OPENINGS=[
  { name:"Italian Game", video:{ id:"qUews8fEGkc", title:"Italian Game Crash Course", author:"Remote Chess Academy", length:"20 min" }, eco:"C50", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","e5","Nf3","Nc6","Bc4","Bc5","c3","Nf6","d3","d6"],
    idea:"Develop quickly, point the bishop at f7, and build a strong centre with c3 and d3. One of the best first openings to learn.",
    notes:["King's pawn — the most popular and best first move.","Black mirrors: the Open Game.","Develop the knight and hit e5.","Defend e5 and develop.","The Italian bishop, aimed at f7 — Black's softest square.","Black copies, eyeing f2: the Giuoco Piano.","Prepare d4 for a big centre, and give the bishop a retreat.","Develop and hit e4.","Solidly defend e4 (the modern, safe way; the old d4 is sharper).","Black mirrors. Both sides developed and ready to castle: a calm, rich position, ideal for learning plans."],
    plans:"A slow-burn strategic game. Castle, then prepare the d4 break (Re1, Nbd2, Bb3 first). Reroute the b1-knight via d2–f1–g3 toward the kingside. Healthy and roughly equal — a perfect opening to grow on.",
    arrows:{ 5:[["c4","f7"]] },
    vars:[
      { name:"Giuoco Pianissimo (quiet)", line:["e4","e5","Nf3","Nc6","Bc4","Bc5","d3","Nf6","O-O","O-O","c3","d6"],
        idea:"The slow, safe Italian: both sides castle and manoeuvre, aiming for a later d4. Low risk, great for learning plans.",
        notes:["King's pawn opening.","The Open Game.","Develop and hit e5.","Defend e5.","The Italian bishop, eyeing f7.","The Giuoco Piano.","The 'pianissimo': calm support of e4 before committing.","Develop and hit e4.","Castle into safety.","Black castles too.","Prepare a slow d4 and free the bishop.","Both sides fully developed. A quiet manoeuvring game where understanding plans beats memorizing moves."],
        plans:"Pure manoeuvring: Re1, Nbd2–f1–g3, Bb3, h3, then a well-timed d4. Slow build-up toward the centre and kingside, very low risk. The model 'understand-the-plan' opening.",
        arrows:{ 5:[["c4","f7"]] } },
      { name:"Two Knights Defence", line:["e4","e5","Nf3","Nc6","Bc4","Nf6","Ng5","d5","exd5","Na5","Bb5+","c6"],
        idea:"Black answers 3…Nf6, inviting 4.Ng5. After 5…Na5 Black gives a pawn for fast development — far safer than the greedy 5…Nxd5.",
        notes:["King's pawn opening.","The Open Game.","Develop and hit e5.","Defend e5.","The Italian bishop, eyeing f7.","The Two Knights: develop and hit e4 instead of …Bc5.","White lunges at f7 (crude but tricky).","The right reply: block the bishop and hit e4.","Take the pawn.","The safe move: hit the c4-bishop and refuse the sac.","Check instead of retreating.","Block and chip at the bishop. Black gives a pawn for fast development and easy play — sound and active."],
        plans:"You went for 4.Ng5 and Black defended correctly with …Na5. You're a pawn up but Black has the bishop pair and quick play — go solid (Be2, d3, O-O, Nc3) and return the pawn if it helps. Roughly level. The knockout 5…Nxd5?? is the Fried Liver in the Gambits tab.",
        arrows:{ 5:[["c4","f7"]], 7:[["g5","f7"]], 10:[["a5","c4"]] } },
      { name:"Evans Gambit", line:["e4","e5","Nf3","Nc6","Bc4","Bc5","b4","Bxb4","c3","Ba5","d4","exd4","O-O"],
        idea:"Sacrifice the b-pawn so c3 + d4 rip open the centre while you swing pieces at f7. A favourite of Morphy and Kasparov.",
        notes:["King's pawn opening.","The Open Game.","Develop and hit e5.","Defend e5.","The Italian bishop, eyeing f7.","The Giuoco Piano.","b4!? The Evans Gambit — offer the b-pawn to deflect the bishop.","Black accepts.","Gain a tempo and prepare d4.","The bishop slides back.","Blast open the centre with tempo.","Black grabs again.","Castle. A big centre, open lines and a development lead for one pawn (full notes in the Gambits tab)."],
        plans:"Open lines fast (cxd4 or e5), bring Qb3 and Ba3 onto f7 and the castling squares, and attack. One pawn for a roaring initiative — see the Gambits section for the deep dive.",
        arrows:{ 5:[["c4","f7"]], 7:[["b4","c5"]], 11:[["d4","e5"]] } },
    ] },
  { name:"Ruy López (Spanish)", video:{ id:"IQrtrPvU3bQ", title:"Ruy Lopez: Ideas & Plans", author:"Remote Chess Academy", length:"lesson" }, eco:"C60", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","e5","Nf3","Nc6","Bb5","a6","Ba4","Nf6","O-O","Be7"],
    idea:"The bishop pressures the knight defending e5. A deeply strategic opening played at every level for centuries.",
    notes:["King's pawn — the most popular and best first move.","Black mirrors: the Open Game.","Develop the knight and hit e5.","Defend e5.","The Spanish bishop, pressuring the c6-knight that guards e5.","The Morphy move: question the bishop at once.","Keep the bishop on the great diagonal.","Develop and hit e4.","Castle; e4 is left 'poisoned' but safe.","Black develops, ready to castle: the Closed Ruy. The deepest strategic battle in chess, played for 150 years."],
    plans:"Long strategic manoeuvring. Play c3 and d4 for a centre, run the 'Spanish knight tour' Nb1–d2–f1–g3, and probe the queenside with a4. Patience and plans matter far more than early tactics — a masterclass opening.",
    arrows:{ 5:[["b5","c6"]] },
    vars:[
      { name:"Berlin Defence", line:["e4","e5","Nf3","Nc6","Bb5","Nf6","O-O","Nxe4","d4","Nd6","Bxc6","dxc6","dxe5","Nf5"],
        idea:"Black trades into the famous 'Berlin Wall' endgame — rock-solid and a favourite of world champions.",
        notes:["King's pawn opening.","The Open Game.","Develop and hit e5.","Defend e5.","The Spanish bishop pressures c6.","The Berlin: develop and hit e4 right away.","Castle, offering e4.","Black grabs the pawn.","Strike the centre and open lines.","The knight retreats, hitting the b5-bishop.","Trade before recapturing.","Black recaptures: doubled pawns, but the bishop pair.","Win the pawn back.","Heading for the 'Berlin Wall' endgame: super-solid, a world-championship favourite. Equal but tough to crack."],
        plans:"The Berlin steers toward a queenless, rock-solid endgame: you have a kingside pawn majority and slightly better structure, Black has the bishop pair. Play patiently for the long-term edge — there's room to outplay.",
        arrows:{ 5:[["b5","c6"]], 9:[["d4","e5"]] } },
      { name:"Exchange Variation", line:["e4","e5","Nf3","Nc6","Bb5","a6","Bxc6","dxc6","O-O","f6"],
        idea:"White trades on c6 to damage Black's pawns, banking on a better long-term structure.",
        notes:["King's pawn opening.","The Open Game.","Develop and hit e5.","Defend e5.","The Spanish bishop pressures c6.","Question the bishop.","The Exchange: trade off to damage Black's pawns.","Black recaptures: the bishop pair, but doubled c-pawns.","Castle and play on the better structure.","Black props up e5. White banks on a healthier long-term structure (a clean kingside majority) versus the bishops. A clear, easy plan."],
        plans:"Trade pieces and head for an endgame: your 4-vs-3 kingside majority can make a passed pawn, Black's doubled c-pawns can't. Aim to swap queens and grind the structural edge. Low-theory and very practical.",
        arrows:{ 5:[["b5","c6"]], 7:[["b5","c6"]] } },
    ] },
  { name:"Scotch Game", video:{ id:"_r4QNfOzPik", title:"Scotch Game for Beginners", author:"Remote Chess Academy", length:"lesson" }, eco:"C45", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","e5","Nf3","Nc6","d4","exd4","Nxd4","Nf6","Nc3","Bb4"],
    idea:"Strike the centre immediately with d4. Opens the position fast and avoids heavily-studied Ruy López theory.",
    notes:["King's pawn — the most popular and best first move.","Black mirrors: the Open Game.","Develop the knight and hit e5.","Defend e5.","Strike the centre at once: the Scotch.","Black captures.","Recapture with the knight, nicely centralized.","Develop and hit e4.","Defend e4 and develop.","Black pins the c3-knight. An open, lively game; White has easy development and a touch more space — a great way to dodge heavy Ruy theory."],
    plans:"Straightforward and open: finish developing (Bd3/Be2, O-O), keep the d4-knight strong or trade it for structure, and play in the centre. Far less memorization than the Ruy, with clear, healthy positions.",
    arrows:{ 5:[["d4","e5"]] },
    vars:[
      { name:"Classical (4...Bc5)", line:["e4","e5","Nf3","Nc6","d4","exd4","Nxd4","Bc5","Be3","Qf6","c3","Nge7"],
        idea:"Black hits the d4-knight with bishop and queen; White shores it up with Be3 and c3.",
        notes:["King's pawn opening.","The Open Game.","Develop and hit e5.","Defend e5.","Strike the centre (the Scotch).","…exd4 captures.","Recapture, centralized.","Black hits the d4-knight with the bishop.","Defend the knight and offer a trade.","Pile a second attacker onto d4.","Shore up d4 once and for all.","Black develops toward g6. A solid, classical fight around the d4-square; roughly equal with clear plans."],
        plans:"Hold the d4-point (Be3, c3), develop smoothly, and expand with f4/Nd2 ideas or trade into a comfortable structure. A sound, principled middlegame.",
        arrows:{ 5:[["d4","e5"]], 8:[["c5","d4"]] } },
      { name:"Mieses (4...Nf6 5.Nxc6)", line:["e4","e5","Nf3","Nc6","d4","exd4","Nxd4","Nf6","Nxc6","bxc6","e5","Qe7"],
        idea:"The main modern line: White grabs space with e5, Black hits back with …Qe7.",
        notes:["King's pawn opening.","The Open Game.","Develop and hit e5.","Defend e5.","Strike the centre (the Scotch).","…exd4 captures.","Recapture, centralized.","Develop and hit e4.","The modern main line: trade the knights.","Black recaptures: the centre, but doubled c-pawns.","Gain space and kick the f6-knight.","Black hits the e5-pawn and unpins. Sharp and concrete; White has space, Black the bishop pair. Roughly balanced, well-charted."],
        plans:"Use the e5-spearhead and your development lead: Qe2, Be2/Bd3, O-O, c4, and press Black's doubled pawns. Black strikes with …d6 or …Ba6 — be ready. Dynamic equality.",
        arrows:{ 5:[["d4","e5"]], 11:[["e5","f6"]] } },
    ] },
  { name:"Vienna Game", video:{ id:"x7NhxHm5qoI", title:"Vienna: Aggressive 1.e4", author:"Remote Chess Academy", length:"lesson" }, eco:"C25", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","e5","Nc3","Nf6","f4","d5","fxe5","Nxe4"],
    idea:"A flexible, aggressive setup developing the knight first and following with f4 for a kingside pawn storm.",
    notes:["King's pawn — the most popular and best first move.","Black mirrors: the Open Game.","Develop the knight first: the flexible, aggressive Vienna.","Black develops and eyes e4.","The Vienna Gambit: a delayed King's Gambit striking at e5.","The correct reply: counter in the centre, not 4…exf4.","Take the e5-pawn.","Black grabs e4 with tempo. Sharp and roughly balanced — the e4-knight is active but White challenges it with Nf3, d3 and Qe2. Lively, less-charted ground."],
    plans:"Aggressive and flexible: f4 for a kingside storm, develop Nf3/Bc4/d3, and aim at the f-file and f7. Sharper and rarer than the main e4 lines — fine surprise value with healthy play.",
    arrows:{ 5:[["f4","e5"]], 6:[["d5","e4"]] },
    vars:[
      { name:"Vienna Gambit", line:["e4","e5","Nc3","Nf6","f4","d5","fxe5","Nxe4","Nf3","Bg4"],
        idea:"The critical gambit line — open the f-file and develop rapidly toward Black's king.",
        notes:["King's pawn opening.","The Open Game.","The Vienna.","Develop, eye e4.","f4!? the Vienna Gambit.","…d5! the central counter.","Take e5.","Grab e4 with tempo.","Develop, cover key squares, and prepare to challenge the e4-knight.","Black pins the knight and develops actively. Critical, double-edged play — open lines and chances for both sides."],
        plans:"Develop with purpose: d3 to kick the e4-knight, Be2 to break the …Bg4 pin, then castle and use the half-open f-file. Sharp and roughly balanced — outplay your opponent in the complications.",
        arrows:{ 5:[["f4","e5"]], 9:[["f3","e5"]] } },
      { name:"Bishop trap (3.Bc4 Nxe4?)", line:["e4","e5","Nc3","Nf6","Bc4","Nxe4","Qh5","Nd6","Qxe5+","Qe7","Qxe7+","Bxe7"],
        idea:"A classic trap to know: grabbing on e4 runs into Qh5! hitting e5 and f7, winning a pawn and the initiative.",
        notes:["King's pawn opening.","The Open Game.","The Vienna.","Develop, eye e4.","The Italian-style bishop, eyeing f7.","Grabbing the pawn is the tempting mistake.","Qh5! The trap: double-attacking e5 and f7 (mate threat on f7).","The only defence: cover f7 and block the queen.","Snap off the e5-pawn with check.","Black blocks and offers a trade.","Trade queens.","White emerges a clean pawn up with the better game. A classic trap, worth knowing from both sides."],
        plans:"Know this pattern cold: after …Nxe4?!, Qh5! forks e5 and f7. You win a pawn and keep the initiative. If Black avoids …Nxe4 and develops normally, just play a healthy Vienna.",
        arrows:{ 5:[["c4","f7"]], 7:[["h5","f7"],["h5","e5"]] } },
    ] },
  { name:"Sicilian Defense", video:{ id:"MYGSzNKnlK4", title:"Sicilian Defense Crash Course", author:"Remote Chess Academy", length:"lesson" }, eco:"B90", side:"b", cat:"Defenses to 1. e4",
    line:["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","a6"],
    idea:"Black's most aggressive answer to 1.e4 (this is the famous Najdorf). Fights for the centre asymmetrically and plays for the win.",
    notes:["White's most popular first move.","The Sicilian! Black fights for the centre asymmetrically — the most ambitious answer to 1.e4.","White develops and prepares d4.","Supports a future …e5/…Nf6 and opens the c8-bishop.","White strikes the centre.","Trade a wing pawn for a centre pawn: the Sicilian's whole point.","White recaptures with a strong knight.","Develop and hit e4.","Defend e4 and develop.","The Najdorf! A tiny but mighty move: it stops Nb5/Bb5 and prepares …e5 or …b5. The most popular Sicilian on earth."],
    plans:"A fighting, double-edged battle. Black plays for queenside expansion (…b5, …Bb7) and central breaks (…e5 or …e6/…d5); White attacks on the kingside. Know your lines — sharp, but it rewards bold, active play.",
    arrows:{ 2:[["c5","d4"]], 5:[["d4","c5"]], 10:[["a6","b5"]] },
    vars:[
      { name:"Dragon Variation", line:["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","g6"],
        idea:"Black fianchettoes to g7, aiming at White's queenside. Razor-sharp opposite-side attacks.",
        notes:["King's pawn.","The Sicilian.","Develop, prepare d4.","Support the centre.","Strike.","The Sicilian trade.","Recapture.","Hit e4.","Defend e4.","The Dragon! The bishop heads to g7, raking the long diagonal at White's queenside. Razor-sharp opposite-wing attacks."],
        plans:"Fianchetto …Bg7, castle, and storm the queenside (…Rc8, …Ne5, …b5) while the dragon bishop rakes the long diagonal. White castles long and races with h4-h5 — whoever attacks faster wins. Not for the faint-hearted.",
        arrows:{ 5:[["d4","c5"]], 10:[["g7","b2"]] } },
      { name:"Classical Variation", line:["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","Nc6"],
        idea:"Natural development with …Nc6. Solid and flexible — a great first Sicilian.",
        notes:["King's pawn.","The Sicilian.","Develop, prepare d4.","Support the centre.","Strike.","The Sicilian trade.","Recapture.","Hit e4.","Defend e4.","The Classical: natural development, a second knight on its best square. Solid, flexible — a great first Sicilian."],
        plans:"Develop naturally (…Nc6, …e6 or …e5, …Be7, …O-O) and play for counterplay on the c-file and in the centre. Less memorization than the Najdorf or Dragon — a sound, club-friendly Sicilian.",
        arrows:{ 5:[["d4","c5"]] } },
      { name:"Accelerated Dragon", line:["e4","c5","Nf3","Nc6","d4","cxd4","Nxd4","g6"],
        idea:"Reach a Dragon setup a move faster, often dodging White's most dangerous tries.",
        notes:["King's pawn.","The Sicilian.","Develop, prepare d4.","Develop the knight first (delaying …d6).","Strike.","The Sicilian trade.","Recapture.","The Accelerated Dragon: reach the fianchetto a move faster, dodging White's sharpest tries. Watch for the Maróczy Bind (c4)."],
        plans:"Fianchetto and castle quickly; the saved tempo lets you meet many setups comfortably and aim for the freeing …d5 break. White's critical try is the Maróczy Bind (c4) clamping the centre — manoeuvre patiently against it.",
        arrows:{ 5:[["d4","c5"]] } },
    ] },
  { name:"French Defense", video:{ id:"iXEEAoYeNSI", title:"French Defense Crash Course", author:"Remote Chess Academy", length:"lesson" }, eco:"C00", side:"b", cat:"Defenses to 1. e4",
    line:["e4","e6","d4","d5","Nc3","Nf6","e5","Nfd7"],
    idea:"Solid and resilient. Black accepts a slightly cramped position to build a rock-solid pawn chain and counterattack.",
    notes:["King's pawn.","The French. Black prepares …d5 to challenge e4 — solid and resilient.","White builds the big centre.","Strike at e4 right away.","Defend e4 and develop (the main line).","Pile pressure on e4.","White advances, gaining space and kicking the knight.","The knight regroups; Black will chip at the chain with …c5 and …f6. A cramped but very sturdy pawn-chain battle."],
    plans:"It's all about the pawn chains. White has space; you counterattack the base with …c5 (and sometimes …f6). The light-squared bishop is your 'problem piece' — free it with …b6/…Ba6 or a timely …f6. Patient, resilient, counterpunching chess.",
    arrows:{ 4:[["d5","e4"]], 7:[["e5","f6"]] },
    vars:[
      { name:"Advance (3.e5)", line:["e4","e6","d4","d5","e5","c5","c3","Nc6","Nf3","Qb6"],
        idea:"White grabs space with e5; Black chips at the base of the chain with …c5 and …Qb6.",
        notes:["King's pawn.","The French.","Big centre.","Strike e4.","The Advance: grab space and lock the centre.","Hit the base of the chain (d4).","Prop up d4.","Pile onto d4.","Defend d4 and develop.","A third hit on d4, also eyeing b2. Black pressures the chain's base while White holds the space."],
        plans:"Attack d4 relentlessly (…c5, …Nc6, …Qb6, …cxd4) and aim for the …f6 break to crack the chain. Develop the light bishop before …e6 boxes it in. White has space; you have a clear target on d4.",
        arrows:{ 6:[["c5","d4"]], 10:[["b6","d4"]] } },
      { name:"Exchange (3.exd5)", line:["e4","e6","d4","d5","exd5","exd5","Nf3","Nf6","Bd3","Bd6"],
        idea:"Symmetrical and solid — easy to play and very safe.",
        notes:["King's pawn.","The French.","Centre.","Strike.","The Exchange: White releases the tension.","Recapture into a symmetrical structure.","Develop.","Develop.","The bishop eyes h7.","Black mirrors. Dead symmetrical and very solid — hard to lose, but White has a tiny tempo edge. A safe line to know."],
        plans:"Symmetry means small margins: develop sensibly (Bd6, …O-O, …Re8, …c6), avoid weaknesses, and play for a tiny edge or a comfortable draw. Don't overpress — the structure is balanced.",
        arrows:{ 5:[["e4","d5"]] } },
      { name:"Winawer (3.Nc3 Bb4)", line:["e4","e6","d4","d5","Nc3","Bb4","e5","c5"],
        idea:"Black pins the knight and plays sharply against White's centre — the most combative French.",
        notes:["King's pawn.","The French.","Centre.","Strike e4.","Defend e4.","The Winawer! Pin the c3-knight, hitting e4 a different way — the sharpest French.","White advances; Black will provoke …Bxc3, doubling White's pawns.","Strike the chain at once. Hyper-sharp: Black trades the dark bishop for dark-square play and a queenside attack. Double-edged and theory-heavy."],
        plans:"A fight of imbalances: trade the dark bishop for the c3-knight (doubling White's pawns) and attack the queenside and dark squares, while White uses the bishop pair and kingside space. Sharp, concrete, and very rewarding.",
        arrows:{ 6:[["b4","c3"]], 8:[["c5","d4"]] } },
    ] },
  { name:"Caro-Kann Defense", video:{ id:"HvER2idtW6M", title:"Caro-Kann in 15 Minutes", author:"Remote Chess Academy", length:"15 min" }, eco:"B10", side:"b", cat:"Defenses to 1. e4",
    line:["e4","c6","d4","d5","Nc3","dxe4","Nxe4","Bf5"],
    idea:"Reach a solid, sound structure while freeing the light-squared bishop. Great for positional players.",
    notes:["King's pawn.","The Caro-Kann. Black prepares …d5 like the French, but keeps the light bishop free.","White builds the centre.","Strike at e4.","Defend e4.","Trade, opening lines.","Recapture, knight centralized.","The point of the Caro: the light bishop develops ACTIVELY, outside the chain (unlike the French). Solid, sound, strategically rich."],
    plans:"Rock-solid and structurally sound. Develop the bishop to f5/g6 before …e6, then …e6, …Nd7, …Ngf6, …Be7/Bd6, …O-O for a healthy, slightly passive but very durable game. You rarely get crushed in the Caro — outlast your opponent.",
    arrows:{ 4:[["d5","e4"]], 8:[["f5","c2"]] },
    vars:[
      { name:"Advance (3.e5 Bf5)", line:["e4","c6","d4","d5","e5","Bf5","Nf3","e6","Be2","c5"],
        idea:"Black develops the bishop OUTSIDE the pawn chain before …e6 — the big plus of the Caro.",
        notes:["King's pawn.","The Caro.","Centre.","Strike e4.","The Advance: grab space and lock the centre.","The big Caro point: the bishop gets out before …e6 locks it in (the move the French player envies).","Develop.","Now …e6 is fine; the bishop's already outside.","Develop.","Hit the base of the chain. A comfortable French-style position, but with Black's good bishop already active. Very pleasant for Black."],
        plans:"Best of both worlds: the active f5-bishop plus a solid chain. Pressure d4 with …c5/…Nc6/…Qb6, develop smoothly, and aim for …f6 or queenside play. White has space, but your pieces are happy.",
        arrows:{ 5:[["e5","d6"]], 10:[["c5","d4"]] } },
      { name:"Exchange (3.exd5)", line:["e4","c6","d4","d5","exd5","cxd5","Bd3","Nc6","c3","Nf6"],
        idea:"A simple, solid structure where Black is very comfortable.",
        notes:["King's pawn.","The Caro.","Centre.","Strike e4.","The Exchange: release the tension.","Recapture into a clean, symmetrical structure.","The bishop eyes h7.","Develop and eye d4.","Support d4.","Develop comfortably. Black equalizes easily — simple and safe. (The sharper Panov, with c4, is White's try for more.)"],
        plans:"Easy, comfortable equality: develop naturally (…Nc6, …Nf6, …Bg4 or …Bf5, …e6, …Bd6, …O-O). Watch for White switching to the Panov-Botvinnik Attack (an early c4) for sharper, isolated-pawn play.",
        arrows:{ 5:[["e4","d5"]] } },
    ] },
  { name:"Scandinavian Defense", video:{ id:"sKoBj-kL0hg", title:"Scandinavian in 15 Minutes", author:"Remote Chess Academy", length:"15 min" }, eco:"B01", side:"b", cat:"Defenses to 1. e4",
    line:["e4","d5","exd5","Qxd5","Nc3","Qa5","d4","Nf6"],
    idea:"Black challenges the centre on move one. Simple to learn with clear plans — good for club players.",
    notes:["King's pawn.","The Scandinavian! Black challenges the centre on the very first move.","White takes (the critical try).","Recapture with the queen — unusual so early, but it works.","White develops with tempo, hitting the queen.","The queen steps to a safe, active square (eyeing pins on c3 later).","White grabs the centre.","Develop. Simple, sound, and easy to learn — clear plans every game. A great club-level choice."],
    plans:"Refreshingly simple: …Nf6, …c6 (a safe home for the queen and luft), …Bf5 or …Bg4 (active bishop), …e6, …Bd6/Be7, …O-O. You get a solid, understandable position. Avoid early queen adventures — just develop and be sound.",
    arrows:{ 2:[["d5","e4"]], 5:[["c3","d5"]] },
    vars:[
      { name:"Modern (2...Nf6)", line:["e4","d5","exd5","Nf6","d4","Nxd5","Nf3","g6"],
        idea:"Instead of recapturing with the queen, Black plays …Nf6 then …Nxd5 and fianchettoes for active piece play.",
        notes:["King's pawn.","The Scandinavian.","White takes.","The Modern: develop a knight, planning to round up d5 without losing time.","White holds the pawn for now and grabs space.","Regain the pawn; the knight sits actively on d5.","Develop.","Fianchetto for active piece play. A dynamic, piece-based Scandinavian — no early queen sorties, smooth development, a comfortable game."],
        plans:"Develop actively: …g6/…Bg7 (or …Bf5), …O-O, …Nc6, …c6 or …c5, and pressure White's centre. The d5-knight is well-placed. A modern, low-risk way to fight for the centre as Black.",
        arrows:{ 2:[["d5","e4"]] } },
    ] },
  { name:"Queen's Gambit", video:{ id:"oRfGbul6MUs", title:"Queen's Gambit: Traps & Ideas", author:"Remote Chess Academy", length:"15 min" }, eco:"D30", side:"w", cat:"1. d4 — Queen's Pawn",
    line:["d4","d5","c4","e6","Nc3","Nf6","Bg5","Be7"],
    idea:"Offer a pawn to deflect Black's d-pawn and dominate the centre. A cornerstone of classical strategy (this is the Declined).",
    notes:["The queen's pawn — White's other great first move, fighting for the centre.","Black stakes a claim too.","The Queen's Gambit: offer the c-pawn to deflect Black's d-pawn and rule the centre.","Black declines, supporting d5 (the rock-solid Queen's Gambit Declined).","Develop and add pressure to d5.","Develop and defend d5.","Pin the f6-knight, piling onto d5.","Break the pin and prepare to castle. A classical, strategically deep fight for the centre — the backbone of 1.d4 chess."],
    plans:"Not a real gambit — Black can't safely hold the pawn, so it's about central control. Play the minority attack (b4-b5 on the queenside) or central expansion (e4), develop harmoniously, and squeeze. The QGD is the gold standard of solid strategy.",
    arrows:{ 3:[["c4","d5"]], 7:[["g5","f6"]] },
    vars:[
      { name:"Queen's Gambit Accepted", line:["d4","d5","c4","dxc4","Nf3","Nf6","e3","e6","Bxc4","c5"],
        idea:"Black grabs the pawn but won't hold it; White regains it with easy development and a central edge.",
        notes:["Queen's pawn.","Stake the centre.","The Queen's Gambit.","The QGA: Black accepts the pawn (but won't try to keep it).","Develop, in no rush to recapture c4.","Develop.","Open the bishop's path to c4.","Prepare to develop and free the position.","Regain the pawn with a nicely-placed bishop and a central edge.","Strike at d4 for activity. White has a slight central pull; Black has free piece play. A sound, open game."],
        plans:"Regain c4 with the bishop, build with e3/Nc3/O-O, and use your central majority and development lead. Black hits d4 with …c5 — meet it calmly and aim for an isolated-pawn or hanging-pawns middlegame where your activity tells.",
        arrows:{ 3:[["c4","d5"]] } },
      { name:"Slav Defence", line:["d4","d5","c4","c6","Nf3","Nf6","Nc3","dxc4"],
        idea:"Black supports d5 with …c6 instead of blocking the bishop with …e6. Solid and very popular up top.",
        notes:["Queen's pawn.","Stake the centre.","The Queen's Gambit.","The Slav: support d5 with the c-pawn, keeping the light bishop free.","Develop.","Develop and defend d5.","Develop and pressure d5.","Black takes, intending …b5 to hold it (or …Bf5 first). Rock-solid and hugely popular — the bishop stays active, the structure sound."],
        plans:"The Slav's big plus over the QGD is the free light bishop (…Bf5/…Bg4 before …e6). White plays to regain c4 (a4 ideas) and use central space; both sides get a sound, strategically rich game. One of the most reliable answers to the QG.",
        arrows:{ 3:[["c4","d5"]] } },
    ] },
  { name:"London System", video:{ id:"dMNnjwT0RPE", title:"London System: Every Line", author:"Remote Chess Academy", length:"lesson" }, eco:"D02", side:"w", cat:"1. d4 — Queen's Pawn",
    line:["d4","d5","Bf4","Nf6","e3","e6","Nf3","Bd6"],
    idea:"A reliable system you can play against almost anything: the same easy setup every game. Excellent for busy players.",
    notes:["The queen's pawn.","Black mirrors.","The London! Develop the bishop OUTSIDE the chain before e3 — the whole point of the system.","Develop.","Support d4 and open the f1-bishop.","Develop solidly.","Develop.","Black offers to trade the good bishop. The London is a SYSTEM: the same easy setup (Bf4, e3, Nf3, Bd3, c3, Nbd2, O-O) every game. Low theory, solid positions, perfect for busy players."],
    plans:"Play almost on autopilot: Bf4, e3, Bd3, c3, Nbd2, O-O, then look for e4 or a kingside attack (Ne5, Qf3, Rf-e1). Trade off Black's good bishop when you can, keep the structure solid, and outplay opponents in the middlegame. Reliable and stress-free.",
    arrows:{ 3:[["f4","c7"]] },
    vars:[
      { name:"vs Fianchetto setup", line:["d4","Nf6","Bf4","g6","Nc3","d5","e3","Bg7","Be2","O-O"],
        idea:"The London works against a kingside fianchetto too — same plan, same comfort.",
        notes:["Queen's pawn.","Develop, heading for a fianchetto.","The London bishop, out early as always.","Black goes for a King's-Indian-style fianchetto.","Develop (a flexible, slightly sharper move-order here).","Stake the centre.","Support d4.","Complete the fianchetto.","Develop and prepare to castle.","Black castles. Same London comfort versus a fianchetto: solid structure, easy plan, no sharp theory required."],
        plans:"The London works against everything, including fianchetto setups: keep your solid Bf4/e3/Be2/O-O structure, watch the e5-square, and look for h3/Ne5 or a central e4 break. Don't fear the g7-bishop — stay solid and play your plan.",
        arrows:{ 3:[["f4","c7"]] } },
      { name:"Jobava London (2.Nc3, 3.Bf4)", line:["d4","Nf6","Nc3","d5","Bf4","a6","e3","e6"],
        idea:"A sharper, trendier London with the knight on c3 — more direct attacking chances.",
        notes:["Queen's pawn.","Develop.","The Jobava move-order: knight first, eyeing a quick e4 and sharper play.","Stake the centre, stopping e4 for now.","The London bishop, in a more aggressive setup.","A useful prophylactic move (stopping Nb5 ideas).","Support d4.","Develop solidly. The Jobava is the trendy, sharper cousin: with Nc3 (not c3), White keeps Nb5, e4, and quick-attack ideas. More punch than the classic London."],
        plans:"Sharper than the classic London: with the knight on c3 aim for e4, Nb5 hitting c7/d6, and quick kingside aggression (h4-h5, Bd3, Qf3). Trendy and dangerous — play for the attack while keeping a sound structure.",
        arrows:{ 5:[["f4","c7"]] } },
    ] },
  { name:"King's Indian Defense", video:{ id:"dM2AKqzRM84", title:"King's Indian: Easy Guide", author:"Remote Chess Academy", length:"lesson" }, eco:"E60", side:"b", cat:"Defenses to 1. d4",
    line:["d4","Nf6","c4","g6","Nc3","Bg7","e4","d6"],
    idea:"Let White build a big centre, then strike back with pieces and pawns. A fighting defense full of attacking ideas.",
    notes:["White's queen's pawn.","Develop, flexible.","White grabs more centre.","The King's Indian: prepare to fianchetto and let White build a big centre… then attack it.","Develop.","The KID bishop, raking the long diagonal.","White builds the big pawn centre (the KID's whole premise).","Support a future …e5 break. A fighting, double-edged defence: White gets space, Black gets a kingside attacking machine. Loved by Fischer and Kasparov."],
    plans:"Let White have the big centre, then blow it open: castle, play …e5 (or …c5). If White closes with d5, launch the thematic kingside storm — …Ne8/Nd7, …f5, …f4, …g5-g4 at the king. White attacks the queenside; you race on the kingside. Pure fighting chess.",
    arrows:{ 6:[["g7","a1"]], 7:[["e4","d5"]] },
    vars:[
      { name:"Classical Main Line", line:["d4","Nf6","c4","g6","Nc3","Bg7","e4","d6","Nf3","O-O","Be2","e5"],
        idea:"Black strikes with …e5 and aims for a kingside pawn storm with …f5, …g5, …f4.",
        notes:["Queen's pawn.","Develop.","Grab centre.","The KID.","Develop.","Fianchetto.","The big centre.","Support …e5.","Develop (the Classical main line).","Castle into the coming storm.","Develop and prepare to castle.","The thematic strike. If White closes with d5, Black gets the dream KID kingside attack; if White trades, the game opens. The main battleground of the KID."],
        plans:"After …e5 the centre usually closes with d5 — then it's a race: storm the kingside (…Ne8/Nd7, …f5, …f4, …g5, …g4, …Rf6-h6) while White breaks on the queenside with c5/b4. Know the pawn-storm patterns cold and attack the king!",
        arrows:{ 7:[["e4","d5"]], 12:[["e5","d4"]] } },
      { name:"Fianchetto (g3)", line:["d4","Nf6","c4","g6","Nc3","Bg7","g3","O-O","Bg2","d6"],
        idea:"White fianchettoes too — a calmer, more positional way to meet the KID.",
        notes:["Queen's pawn.","Develop.","Grab centre.","The KID.","Develop.","Fianchetto.","White fianchettoes too (the calm, positional anti-KID).","Castle.","White's bishop eyes the long diagonal and the centre.","Support …e5/…Nbd7. The Fianchetto is the most positional anti-KID: White's g2-bishop steadies the centre and takes the sting out of Black's attack. A quieter, manoeuvring battle."],
        plans:"Against the Fianchetto the raw kingside storm is less effective (the g2-bishop defends well), so play flexibly: …Nbd7, …e5, …c6/…Qb6 or …Nc6/…e5, and fight for the centre and queenside. Patience over brute force here.",
        arrows:{ 6:[["g7","a1"]], 9:[["g2","a8"]] } },
    ] },
  { name:"Nimzo-Indian Defense", eco:"E20", side:"b", cat:"Defenses to 1. d4",
    line:["d4","Nf6","c4","e6","Nc3","Bb4","e3","O-O"],
    idea:"Pin the knight and fight for the centre with pieces rather than pawns. One of the most respected defenses to 1.d4.",
    notes:["White's queen's pawn.","Develop.","White grabs the centre.","Flexible, preparing …d5 or …Bb4.","Develop, supporting e4.","The Nimzo-Indian! Pin the c3-knight, fighting for the centre (especially e4) with pieces, not pawns.","The flexible Rubinstein setup.","Castle. The Nimzo's theme: trade the bishop for the c3-knight to damage White's pawns and rule the light squares (e4), or keep the tension. Strategically deep and very sound."],
    plans:"Your bishop pins (and often trades for) the c3-knight, leaving White with doubled c-pawns and you with e4 and the light squares — play …d5/…c5, …b6/…Bb7, …Ne4. Or keep the bishop for flexibility. A model 'play for the structure' opening, beloved of strategists.",
    arrows:{ 6:[["b4","c3"]] },
    vars:[
      { name:"Rubinstein (4.e3)", line:["d4","Nf6","c4","e6","Nc3","Bb4","e3","O-O","Bd3","d5"],
        idea:"The flexible main line — White develops naturally and aims for a big centre.",
        notes:["Queen's pawn.","Develop.","Grab centre.","Flexible.","Develop.","The Nimzo pin.","The Rubinstein — flexible and natural.","Castle.","Develop toward the kingside.","Strike the centre. The main-line Nimzo: White develops naturally for a big centre, Black pressures it with …d5/…c5 and the bishop-for-knight trade. Rich, balanced strategic play."],
        plans:"Classic Nimzo: …d5 and …c5 to hit the centre, …Bxc3 at the right moment to give White doubled pawns, then blockade and target them — or keep the bishops and play actively. White wants e4 and the bishop pair; you want structure and light squares.",
        arrows:{ 6:[["b4","c3"]], 10:[["d5","c4"]] } },
      { name:"Classical (4.Qc2)", line:["d4","Nf6","c4","e6","Nc3","Bb4","Qc2","O-O","a3","Bxc3+"],
        idea:"White avoids doubled pawns by recapturing with the queen, banking on the bishop pair.",
        notes:["Queen's pawn.","Develop.","Grab centre.","Flexible.","Develop.","The Nimzo pin.","The Classical: defend c3 with the queen, planning to recapture there and AVOID doubled pawns — banking on the bishop pair.","Castle.","Question the bishop at once.","Trade, forcing Qxc3. White gets the bishop pair and a strong centre but no doubled pawns; Black gets fast development and will hit with …d5/…c5/…b6."],
        plans:"Here White keeps a clean structure and the two bishops, so generate activity fast: …d5 or …c5 to challenge the centre, …b6/…Bb7 and …Ne4 for piece play. Don't let White consolidate the bishop pair in a calm position — keep it dynamic.",
        arrows:{ 6:[["b4","c3"]], 9:[["a3","b4"]] } },
    ] },
  { name:"English Opening", video:{ id:"eM6d2etuzZU", title:"English Opening in 15 Minutes", author:"Remote Chess Academy", length:"15 min" }, eco:"A10", side:"w", cat:"Flank Openings",
    line:["c4","e5","Nc3","Nf6","Nf3","Nc6","g3","Bb4"],
    idea:"Control the centre from the side with c4 and a kingside fianchetto. Flexible and transposes into many structures.",
    notes:["The English: control the centre from the side (the d5-square and a fianchetto) — the flexible 'flank' approach.","Black grabs central space (a 'reversed Sicilian').","Develop and fight for d5.","Develop.","Develop and pressure e5.","Develop.","Prepare the fianchetto; the English bishop's home is g2.","Black pins the c3-knight. Flexible, strategic, transpositional: the English can stay its own beast or morph into QG/Réti structures. A favourite of world champions."],
    plans:"Fianchetto to g2 (eyeing the long diagonal and d5), castle, and play on the c-file and the d5-square. The English is hugely flexible — be ready to transpose, fight for d5, and outmanoeuvre. Patient, strategic, low on forced lines.",
    arrows:{ 1:[["c4","d5"]] },
    vars:[
      { name:"Reversed Sicilian", line:["c4","e5","Nc3","Nf6","Nf3","Nc6","g3","d5","cxd5","Nxd5"],
        idea:"A Sicilian a tempo up for White — flexible and rich in plans.",
        notes:["The English.","A reversed Sicilian.","Develop.","Develop.","Pressure e5.","Develop.","Prepare the fianchetto.","Black strikes the centre.","White takes.","Recapture, knight active. This is a Sicilian with colours reversed (White is 'Black' a tempo up) — use the extra tempo and g2-bishop to fight for d5 and the long diagonal."],
        plans:"Treat it as a Sicilian with an extra move: fianchetto, castle, and pressure d5 and the c-file. The reversed-Sicilian structures are deep and strategic — exploit the extra tempo with smooth development and central/queenside play.",
        arrows:{ 1:[["c4","d5"]] } },
      { name:"Symmetrical (1...c5)", line:["c4","c5","Nc3","Nc6","g3","g6","Bg2","Bg7"],
        idea:"Both sides fianchetto in a balanced, manoeuvring battle.",
        notes:["The English.","Symmetrical: Black mirrors, a balanced manoeuvring battle.","Develop.","Develop.","Prepare the fianchetto.","Black mirrors.","The English bishop on the long diagonal.","Black mirrors. The Symmetrical English: both sides fianchetto and manoeuvre. White's tiny edge is the extra tempo — squeeze patiently."],
        plans:"Symmetry with White's extra tempo: fianchetto both bishops, castle, and probe with d4 or queenside expansion (Rb1, b4) and d5/c-file pressure. A long, manoeuvring battle — outplay your opponent strategically.",
        arrows:{ 1:[["c4","d5"]], 7:[["g2","a8"]] } },
    ] },
  { name:"Réti Opening", eco:"A09", side:"w", cat:"Flank Openings",
    line:["Nf3","d5","c4","e6","g3","Nf6","Bg2","Be7"],
    idea:"A hypermodern approach: develop pieces first and pressure the centre from a distance before committing pawns.",
    notes:["The Réti: develop a piece first, hypermodern style — pressure the centre from afar before committing pawns.","Black grabs central space.","Strike at d5 from the flank, without occupying the centre yet.","Support d5 solidly.","Prepare the fianchetto, the engine of the Réti.","Develop.","The Réti bishop, raking the long diagonal at d5 and beyond.","Develop, ready to castle. The Réti is the ultimate flexible, hypermodern system: pressure the centre with pieces, transpose at will, and outmanoeuvre. Elegant, strategic chess."],
    plans:"Hypermodern flexibility: fianchetto, castle, and pressure d5 with the g2-bishop, c4, and sometimes a second fianchetto (b3/Bb2). Play on the light squares and the c-file, and be ready to transpose into Catalan/English/QGD structures. Understanding over forced lines.",
    arrows:{ 3:[["c4","d5"]], 7:[["g2","d5"]] },
    vars:[
      { name:"King's Indian Attack", line:["Nf3","d5","g3","Nf6","Bg2","e6","O-O","Be7","d3","O-O"],
        idea:"A universal setup (KIA): castle, then expand with e4 — playable against almost anything.",
        notes:["The Réti.","Central space.","Straight for the King's Indian Attack setup.","Develop.","Fianchetto.","Solid.","White castles.","Develop.","Support a future e4 — the KIA's signature.","Black castles. The King's Indian Attack: a universal, no-theory White setup (Nf3, g3, Bg2, O-O, d3, Nbd2, e4) you can play against almost anything. Castle, play e4, and attack the kingside."],
        plans:"A plug-and-play system: complete the setup (Nbd2, e4, Re1, then e5, Nf1-g3/h4, Qe2, Bf4) and storm the kingside — the same attacking plan against many Black structures. Low theory, high practical value, real attacking punch.",
        arrows:{ 9:[["d3","e4"]] } },
    ] },

  { name:"Slav Defense", eco:"D10", side:"b", cat:"Defenses to 1. d4",
    line:["d4","d5","c4","c6","Nf3","Nf6","Nc3","dxc4","a4","Bf5","e3","e6"],
    idea:"Defend d5 with the c-pawn instead of …e6, so the light-squared bishop stays free — the big improvement over the Queen's Gambit Declined. Solid, sound, and trusted at world-championship level.",
    notes:["Queen's pawn.","Claim the centre.","The Queen's Gambit, pressuring d5.","The Slav: prop up d5 with the c-pawn while keeping the c8-bishop's diagonal open.","Develop and cover e5.","Develop and guard d5 and e4.","Pile onto d5.","Take the pawn; thanks to …c6 Black can try …b5 to hold it, or simply give it back for easy play.","Stop …b5 from defending the pawn.","The whole point of the Slav: the light bishop gets OUT before …e6 shuts it in.","Open the path to recapture on c4.","Solidify and prepare to develop. Black is comfortable, with a sound structure and an active, un-blocked light bishop."],
    plans:"Round up the c4-pawn with the bishop, finish developing (…Bd6 or …Be7, …Nbd7, …O-O), then strike with …c5 or …e5. A rock-solid, low-maintenance answer to 1.d4 you can lean on for life." },
  { name:"Queen's Gambit Declined", eco:"D37", side:"b", cat:"Defenses to 1. d4",
    line:["d4","d5","c4","e6","Nc3","Nf6","Bg5","Be7","e3","O-O","Nf3","h6"],
    idea:"Decline the gambit by backing up d5 with …e6 — the most classical answer to 1.d4. You accept a slightly passive light bishop in return for a granite-solid centre.",
    notes:["Queen's pawn.","Claim the centre.","The Queen's Gambit.","Decline it, defending d5 with the e-pawn.","Develop and hit d5.","Develop and guard d5.","Pin the f6-knight to pile pressure on d5.","Calmly break the pin and prepare to castle.","Solid: free the f1-bishop and keep the centre firm.","Tuck the king away.","Bring out the last minor piece.","Put the question to the g5-bishop. A textbook QGD: extremely solid, with the freeing breaks …c5 and …dxc4 to follow."],
    plans:"Solve the c8-bishop with …b6 and …Bb7, or free the game with …dxc4 and a timely …c5 or …e5. Slow, sturdy and very hard to break down — a lifelong defence." },
  { name:"Queen's Gambit Accepted", eco:"D20", side:"b", cat:"Defenses to 1. d4",
    line:["d4","d5","c4","dxc4","Nf3","Nf6","e3","e6","Bxc4","c5","O-O","a6"],
    idea:"Take the gambit pawn, then hand it back for quick, free development and an early …c5 hit on White's centre. This is about activity, not clinging to a pawn.",
    notes:["Queen's pawn.","Claim the centre.","The Queen's Gambit.","Accept the pawn (Black won't try to keep it).","Stop the …e5 freeing break and develop.","Develop and guard e4.","Open the bishop to recapture on c4.","Free the f8-bishop.","Calmly regain the pawn; White has a big centre, Black easy development.","The key freeing move, striking at d4 right away.","White castles.","Prepare …b5 to grab queenside space and chase the c4-bishop. Black has a free, comfortable game."],
    plans:"Hit d4 with …c5, expand with …a6 and …b5, develop …Nc6 and …Be7, and castle. Trade into open, balanced positions where activity beats memorisation." },
  { name:"Trompowsky Attack", eco:"A45", side:"w", cat:"1. d4 — Queen's Pawn",
    line:["d4","Nf6","Bg5","Ne4","Bf4","d5","e3","c5","Bd3","Nc6","Nf3","e6"],
    idea:"Sidestep the heavy 1.d4 theory: 2.Bg5 pins (or trades for) the f6-knight at once, steering the game into your own offbeat waters. A favourite club-level surprise weapon.",
    notes:["Queen's pawn.","Black develops and eyes e4.","The Trompowsky: pin the knight before Black sets up a normal defence.","The most testing reply: hit the bishop and grab the centre.","Keep the bishop on its strong diagonal.","Black builds a broad centre.","Solid: support d4 and open the f1-bishop.","Strike at the d4-pawn.","Challenge the e4-knight and develop.","Develop and add a hit on d4.","Develop and shore up d4.","Black completes a sound, French-like centre. A rich middlegame on your terms, far from the main lines."],
    plans:"Trade or chase the e4-knight, plant the bishop on f4, support d4 with c3 and e3, and play c4 or Ne5 for piece pressure. Low theory, lots of fresh positions where understanding beats memory." },

  // ─────────────── GAMBITS ───────────────
  { name:"Rousseau Gambit", eco:"C50", side:"b", cat:"⚔️ Gambits — as Black",
    line:["e4","e5","Nf3","Nc6","Bc4","f5"],
    idea:"Your favourite! Black meets the quiet Italian with 3…f5 — a reversed King's Gambit that strikes e4 and rips open the f-file. White has four main replies; tap each below to watch the whole line through.",
    notes:[
      "White opens with the king's pawn — the most popular first move.",
      "Black mirrors and fights for the centre: the Open Game.",
      "White develops a knight and hits the e5-pawn.",
      "Black defends e5 and develops.",
      "The Italian bishop, aiming at the soft f7-square — White looks harmless.",
      "The Rousseau Gambit! Black blasts the f-file open and invites White into the chaos. Objectively dubious, but a wild attacking try that catches club players cold.",
    ],
    plans:"You've reached the gambit. The big idea: open the f-file, aim the bishop and queen at f2, and attack White's king. Below are White's four tries — two greedy mistakes you punish, and the two best moves where you still get an easy, aggressive game. Tap each to watch it all the way through.",
    video:{ id:"Y6-RXOh50_w", title:"The Rousseau Gambit — Every Move is a Trap!", author:"GM Igor Smirnov · Remote Chess Academy", length:"~12 min" },
    arrows:{ 6:[["f5","e4"]] },
    vars:[
      { name:"White grabs the pawn (4.exf5)", line:["e4","e5","Nf3","Nc6","Bc4","f5","exf5","e4","Ng1","Nf6","Nc3","d5","Bb3","Bxf5"],
        idea:"The natural grab — and a mistake. Hit back with 4…e4! and you win the pawn back with a dominant centre.",
        notes:["","","","","","The gambit reached. Now White grabs the pawn.","4.exf5 — natural, but it gives up control of e4.","…e4! The point — Black grabs space with tempo and kicks the knight.","The knight slinks all the way home. (5.Qe2? meets 5…Qe7! and it retreats anyway.)","Covers h5 (no Qh5+ tricks) and gets ready for …d5.","White develops and eyes the e4-pawn.","Defends e4 and hits the c4-bishop. The centre is huge.","The bishop has to retreat.","…Bxf5 wins the pawn back — a big centre, the bishop pair, and a clear lead. Black is clearly better."],
        plans:"White's grab backfired. Keep the big d5/e4 centre rolling, develop the bishops, and attack down the open f-file at White's king.",
        arrows:{ 6:[["f5","e4"]], 8:[["e4","f3"]], 12:[["d5","c4"]], 14:[["f5","c2"]] } },
      { name:"Popular mistake (4.Nc3)", line:["e4","e5","Nf3","Nc6","Bc4","f5","Nc3","fxe4","Bxg8","Rxg8","Nxe4","d5","Ng3","Bd6"],
        idea:"Popular — and a mistake. Take on e4; White must hand over the great c4-bishop to win it back, leaving you the bishop pair.",
        notes:["","","","","","The gambit reached. Here White tries the popular Nc3.","4.Nc3 — popular, but it walks into a trick.","Black grabs the pawn. If a knight takes e4, …d5 forks it.","So White must trade the powerful Italian bishop just to win e4 back.","Black takes back with the bishop pair and an open g-file.","White finally regains the pawn.","Hits the knight and rolls the centre forward.","The knight retreats.","The bishops aim kingside. Black is clearly better: two bishops, open g-file, faster development."],
        plans:"Black has the bishop pair, an open g-file, and faster development — everything a gambit wants. Develop actively and attack down the open files at White's king.",
        arrows:{ 6:[["f5","e4"]], 12:[["d5","e4"]], 14:[["d6","h2"]] } },
      { name:"Stockfish's best (4.d4)", line:["e4","e5","Nf3","Nc6","Bc4","f5","d4","exd4","Nxd4","Nf6","Nxf5","d5","exd5","Nxd5","O-O","Bc5"],
        idea:"The engine's pick. Take on d4, develop with …Nf6, and break with …d5 — White's a touch better, but you get easy, active play.",
        notes:["","","","","","The gambit reached. Here White hits back in the centre.","4.d4 — Stockfish's top pick, striking the centre at once.","Black captures; the centre opens.","White recaptures with the knight.","…Nf6! Develop and hit e4 — don't rush to grab f5 back.","A common try, snatching the f5-pawn.","…d5! Hits the c4-bishop and the e4-pawn at once.","White grabs the d5-pawn.","Black recaptures, knight active in the centre.","White castles.","Fully developed and aiming at f2. White's up a pawn, but Black is active with an easy attack."],
        plans:"White's a hair up on material, but Black is the easier side: castle, swing a rook to the open f-file, keep the bishop biting at f2, and attack. Practically, Black has all the fun.",
        arrows:{ 6:[["f5","e4"]], 10:[["f6","e4"]], 12:[["d5","c4"],["d5","e4"]], 16:[["c5","f2"]] } },
      { name:"Solid best (4.d3)", line:["e4","e5","Nf3","Nc6","Bc4","f5","d3","Nf6","O-O","Bc5","Nc3","d6"],
        idea:"White's calm, solid best. You finish developing into a comfortable, aggressive setup — roughly equal.",
        notes:["","","","","","The gambit reached. Here White plays solidly.","4.d3 — the soundest move, propping up e4.","Develop and add pressure to e4.","White castles.","The reversed King's Gambit setup, bishop eyeing f2.","White develops the last minor piece.","Solid and equal, but a comfortable, aggressive game for Black: finish developing and play on the f-file."],
        plans:"Solid and roughly equal, but very playable: develop, look to play on the f-file with …f4 or piece pressure on f2 and e4, and keep the bishop active on c5.",
        arrows:{ 6:[["f5","e4"]], 10:[["c5","f2"]] } },
    ] },
  { name:"Englund Gambit", eco:"A40", side:"b", cat:"⚔️ Gambits — as Black",
    line:["d4","e5","dxe5","Nc6","Nf3","Qe7","Bf4","Qb4+","Bd2","Qxb2","Nc3","Bb4","Rb1","Qa3","Rb3","Qa5"],
    idea:"The 'reverse Tennison' — Black's ICBM. Against 1.d4, fire back 1…e5!?, gambiting a pawn to drag White into an open, trap-filled game. Objectively dubious, but a deadly surprise weapon in blitz.",
    notes:["White goes for a quiet queen's-pawn game.","…e5!? The Englund — Black gambits the e-pawn to blow the game open.","White accepts (declining with 2.e3 or 2.d5 just gives an equal game).","Develop and attack the e5-pawn at once.","Defend the extra pawn.","Pile onto e5 and eye the b4–e1 diagonal (the trap is loading).","The natural move, defending e5… but it walks into the trick.","…Qb4+! Check — and fork the b2-pawn and the f4-bishop along the way.","White blocks the check (the only good square).","Black snatches the pawn back; material's even again.","White's accurate move, sidestepping the trap (if White slips with 6.Bc3?? you win on the spot — see the trap). Now Black must rescue the loose queen on b2.","Pin the c3-knight, develop, and shelter the queen's escape route.","White attacks the b2-queen down the b-file.","The queen slips out, keeping the b4-bishop's pin alive.","White harries the queen once more.","The queen reaches safety on a5, still backing the pin on c3. Black is developed and ready for …Nf6 and …O-O. White stands better (the Englund is dubious), but Black has a real, active game."],
    plans:"A pure surprise weapon: you're hoping White plays the natural Bf4 and Bc3 and walks into …Qb4+ and …Bb4. With best play (6.Nc3) White is slightly better, so keep it for blitz — develop fast (…Nf6, …Bb4, …O-O, …Rb8) and make White prove it.",
    video:{ id:"9XombCXacfE", title:"The ICBM Gambit with Black", author:"YouTube Short", length:"<1 min" },
    arrows:{ 2:[["e5","d4"]], 8:[["b4","f4"],["b4","e1"]], 10:[["b2","a1"]], 12:[["b4","c3"]] },
    vars:[
      { name:"The b2 trap (6.Bc3??)", line:["d4","e5","dxe5","Nc6","Nf3","Qe7","Bf4","Qb4+","Bd2","Qxb2","Bc3","Bb4","Bxb4","Nxb4"],
        idea:"White's most natural-looking reply is a losing blunder: 6.Bc3?? runs into 6…Bb4!, the pinned bishop falls, and a winning fork follows.",
        notes:["Quiet queen's-pawn game.","…e5!? the Englund gambit.","White accepts.","Hit e5.","Defend e5.","Load the trap.","Natural, but careless.","…Qb4+! check, forking b2 and f4.","Block the check.","Grab the pawn; eye the a1-rook.","The trap! It defends a1 and hits the queen, but it's pinned to the king.","…Bb4!! Pin the c3-bishop against the king — it can't survive.","White tries to bail out by trading it.","Recapture, and now …Nc2+ forks the king and rook. Black wins material and the game."],
        plans:"You sprang the trap! Finish up: …Nc2+ forks the king and a1-rook, or …Qxa1 grabs the rook outright. Convert the extra material — and remember White only had to play 6.Nc3 to be fine.",
        arrows:{ 8:[["b4","f4"],["b4","e1"]], 12:[["b4","c3"]], 14:[["b4","c2"]] } },
    ] },
  { name:"Englund Gambit: Rosen Trap", eco:"A40", side:"b", cat:"⚔️ Gambits — as Black",
    line:["d4","e5","dxe5","Bc5","Nf3","d6","exd6","Ne7","dxe7","Bxf2+","Kxf2","Qxd1"],
    idea:"One of the great traps! In the Englund (1.d4 e5), Black plays 2…Bc5 and dangles pawn after pawn in front of White. If White greedily gobbles them all, 5…Bxf2+! drags the king out and 6…Qxd1 snatches the queen. A favourite blitz haymaker.",
    notes:["White heads for a calm queen's-pawn game.","…e5!? The Englund Gambit — Black throws in the e-pawn to blow the game open.","White accepts the pawn.","…Bc5! The Rosen Trap idea: instead of …Nc6, the bishop slashes out toward f2.","Natural development… but White is already skating on thin ice.","…d6! A second pawn offered, to tear open lines straight at the white king.","White grabs it (declining with e3 or Nc3 is far wiser).","…Ne7! A quiet developing move — and the bait. White is tempted to grab a third pawn.","Fatal greed. White wins a knight, but the king is about to pay dearly.","…Bxf2+! The bombshell. It's check, and the king is forced to take.","Forced — and now the d-file and the e1–d1 squares are wide open.","And Black wins the queen! For a bishop and knight Black has bagged White's queen, and the stranded e7-pawn will fall too. Completely winning."],
    plans:"The whole point is to tempt White into grabbing everything. If White takes on e7 (5.dxe7??), …Bxf2+! then …Qxd1 wins the queen. If White is sensible and declines a pawn earlier, just develop comfortably — you've lost nothing real. A deadly surprise in blitz and bullet.",
    arrows:{ 2:[["e5","d4"]], 4:[["c5","f2"]], 10:[["f2","e1"],["d8","d1"]], 12:[["d8","d1"]] } },
  { name:"Légal Trap", eco:"C41", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Nf3","Nc6","Bc4","d6","Nc3","Bg4","Nxe5","Bxd1","Bxf7+","Ke7","Nd5#"],
    idea:"The most famous queen sacrifice in chess. If Black pins your knight with …Bg4 and then greedily grabs your queen, you ignore it with Nxe5! and mate with three minor pieces — Bxf7+ and Nd5#.",
    notes:["King's pawn.","The Open Game.","Attack the e5-pawn.","Defend it.","The Italian bishop, aiming at f7.","A quiet, slightly passive Philidor setup.","Develop; all looks normal.","Black pins your f3-knight to the queen. The bait is set — for White.","Ignore the pin! If …dxe5, then Bxf7+ and Qxg4 wins a clean pawn. The trap is if Black grabs the queen…","Black snatches the queen, certain they're winning. It's the losing move.","Check! The king is dragged forward.","The only legal move (f7 and d7 are both covered by the e5-knight).","Checkmate! Three little pieces mate the king while Black's queen sits useless on d1. Légal's Mate."],
    plans:"A one-shot trap that only works if Black grabs the queen. If Black plays the sober …dxe5 (or doesn't pin at all), you simply win a pawn with Bxf7+ and Qxg4 — so the worst case is still good for you.",
    arrows:{ 8:[["g4","d1"]], 9:[["e5","f7"],["e5","g4"]], 11:[["f7","e8"]], 13:[["d5","e7"]] } },
  { name:"Scholar's Mate", eco:"C20", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Bc4","Nc6","Qh5","Nf6","Qxf7#"],
    idea:"The classic four-move mate every beginner runs into. Queen and bishop gang up on f7 — the square only the king defends. Essential to know from BOTH sides: how to try it, and how to shut it down.",
    notes:["King's pawn.","Symmetrical.","The bishop takes aim at f7.","A natural developing move.","The queen joins the attack on f7 (and eyes e5). Qxf7# is now threatened!","Black develops and hits the queen, but misses the mate. (…g6 or …Qe7 defends.)","Checkmate! The queen captures f7, guarded by the c4-bishop. Scholar's Mate."],
    plans:"As White it only works on an unaware opponent, and strong players punish the early queen sortie. The real lesson is for BLACK: meet Qh5 with …g6 (shooing the queen away) or …Qe7 (guarding f7) and you're completely fine. Don't develop your queen this early in serious games.",
    arrows:{ 3:[["c4","f7"]], 5:[["h5","f7"],["c4","f7"]], 7:[["c4","f7"]] } },
  { name:"Blackburne Shilling Gambit", eco:"C50", side:"b", cat:"⚔️ Gambits — as Black",
    line:["e4","e5","Nf3","Nc6","Bc4","Nd4","Nxe5","Qg5","Nxf7","Qxg2","Rf1","Qxe4+","Be2","Nf3#"],
    idea:"A cheeky blitz trap. Black plays the 'one-shilling' 3…Nd4!?, daring White to grab e5. If White bites with 4.Nxe5??, then …Qg5! double-attacks the knight and g2, and Black crashes through for a smothered-style mate on f3.",
    notes:["King's pawn.","The Open Game.","Attack e5.","Defend it.","The Italian bishop.","The Blackburne Shilling Gambit. It looks like a beginner's blunder (e5 hangs) — but it's the bait.","White grabs the 'free' pawn and walks in. (Correct is 4.Nxd4 or 4.O-O.)","A double attack: the e5-knight AND the g2-pawn are both hanging.","White tries a desperado, forking queen and rook… but it's far too slow.","Black ignores the fork and smashes into g2, now hitting the h1-rook.","Saving the rook — but Black has mate first.","Check, grabbing a pawn with tempo.","The natural block (6.Qe2 survives but hangs the queen).","Checkmate! The little d4-knight delivers a smothered mate. Shilling collected."],
    plans:"A pure surprise weapon for fast time controls. If White declines correctly with 4.Nxd4 exd4 you're only slightly worse, so keep it for blitz — and pounce when someone snatches the e5-pawn.",
    arrows:{ 6:[["d4","f3"]], 8:[["g5","e5"],["g5","g2"]], 10:[["g2","h1"]], 12:[["e4","e1"]], 14:[["d4","f3"]] } },
  { name:"Stafford Gambit: Mating Trap", video:{ id:"nH_fiqlLp2U", title:"The Stafford Gambit", author:"Eric Rosen", length:"lesson" }, eco:"C42", side:"b", cat:"⚔️ Gambits — as Black",
    line:["e4","e5","Nf3","Nf6","Nxe5","Nc6","Nxc6","dxc6","d3","Bc5","Bg5","Nxe4","Bxd8","Bxf2+","Ke2","Bg4#"],
    idea:"The internet's favourite trap (popularised by Eric Rosen). Black gambits a pawn with the Stafford for raking piece activity. If White grabs the queen with Bxd8, …Bxf2+! and …Bg4# delivers a stunning mate — a whole queen down.",
    notes:["King's pawn.","The Open Game.","Attack e5.","A Petrov move order, inviting the Stafford.","White grabs the pawn.","The Stafford Gambit! Black hands over the pawn for lightning development.","White takes the knight…","…and Black recaptures, opening the d-file and freeing both bishops. Huge activity for one pawn.","White plays solidly.","One bishop rakes toward f2; the other is coming to g4.","The natural-looking pin — and the fatal error. (White had to play Be2 or Be3.)","The knight crashes in, ignoring its own queen!","White grabs the queen, thinking it's winning big…","The first blow. Check — and the king is forced to take.","The only legal move (…Kxf2 is impossible: the e4-knight guards f2).","Checkmate! The light bishop pins, the knight covers the escape — a picture mate down a queen."],
    plans:"A glorious blitz trap. Even when White sidesteps the mate, the Stafford gives you fast, aggressive piece play for the pawn — perfect for fast time controls. Aim everything at f2 and down the e-file.",
    arrows:{ 10:[["c5","f2"]], 12:[["e4","f2"]], 14:[["c5","f2"]], 16:[["g4","d1"]] } },
  { name:"Budapest Gambit: Kieninger Trap", video:{ id:"vSnN50aP3p4", title:"Budapest Gambit: Crush 1.d4", author:"Remote Chess Academy", length:"lesson" }, eco:"A52", side:"b", cat:"⚔️ Gambits — as Black",
    line:["d4","Nf6","c4","e5","dxe5","Ng4","Bf4","Nc6","Nf3","Bb4+","Nbd2","Qe7","a3","Ngxe5","axb4","Nd3#"],
    idea:"A gorgeous smothered mate from the Budapest Gambit. Black gambits the e-pawn (2…e5), and if White greedily grabs the b4-bishop with axb4??, Black's knight lands on d3 — smothered mate in the middle of the board.",
    notes:["Queen's pawn.","Develop and fight for e4.","White grabs the centre.","The Budapest Gambit! Black throws in the e-pawn to rip lines open fast.","White accepts.","The knight chases after the e5-pawn (the 'rocket').","Defending the extra pawn.","Pile onto e5.","Defend e5 again.","Check, dragging a defender to an awkward square.","White blocks with the queen's knight.","A third attacker hits e5 (the trap is loading).","White kicks the b4-bishop, expecting the bishop pair.","Ignore it! The knight grabs e5 and uncovers a threat to d3.","White greedily takes the bishop — straight into the trap. (Nxe5 had to be tried.)","Checkmate! The d3-knight smothers the king: it can't move and nothing can capture the knight. The Kieninger Trap."],
    plans:"A famous trap, but the Budapest is a perfectly respectable gambit even when White avoids it — you get active, easy piece play for the pawn. Develop fast and keep an eye on the …Nd3 and …Bb4+ motifs.",
    arrows:{ 6:[["g4","e5"]], 10:[["b4","e1"]], 14:[["g4","e5"]], 16:[["e5","d3"]] } },
  { name:"Albin Counter-Gambit: Lasker Trap", eco:"D08", side:"b", cat:"⚔️ Gambits — as Black",
    line:["d4","d5","c4","e5","dxe5","d4","e3","Bb4+","Bd2","dxe3","Bxb4","exf2+","Ke2","fxg1=N+","Rxg1","Bg4+","Kf2","Bxd1"],
    idea:"The most famous underpromotion in opening theory. Black counter-gambits with the Albin (2…e5), and if White plays the careless 4.e3?, a stunning sequence ends in …fxg1=N+! — promoting to a KNIGHT, not a queen — and Black wins the white queen.",
    notes:["Queen's pawn.","The symmetric reply.","The Queen's Gambit.","The Albin Counter-Gambit! Black gambits a pawn to grab the initiative.","White takes the pawn.","The cramping spearhead; this advanced pawn is the soul of the Albin.","The careless move that springs the trap. (3…Nf3 or g3 is correct.)","Check.","White blocks the check.","The d4-pawn smashes into e3, and the f2-square is now the target.","White grabs the bishop, missing the bombshell. (Bxe3 was forced.)","Check! The pawn marches to f2.","The king steps up to stop the promotion.","The famous underpromotion! Promote to a KNIGHT with check — a new queen would just be met by Qxd1.","White takes the new knight.","Check! The light bishop pins the queen to the king down the diagonal.","The king flees (any king move drops the queen).","And Black wins the queen! A clean extra queen — the Lasker Trap."],
    plans:"A beautiful trap, but the Albin is a genuine fighting gambit even when White defends well. The key idea everywhere is that advanced d4-pawn plus the …Bb4+ and …exf2 tactics — play actively and watch for that underpromotion.",
    arrows:{ 6:[["d4","e3"]], 8:[["b4","e1"]], 12:[["f2","e1"]], 14:[["f2","g1"]], 16:[["g4","d1"]], 18:[["g4","d1"]] } },
  { name:"Halloween Gambit", eco:"C47", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Nf3","Nc6","Nc3","Nf6","Nxe5","Nxe5","d4","Ng6","e5","Ng8","Bc4"],
    idea:"Aarav's favorite gambit! Out of the Four Knights, sacrifice a whole knight on e5 for two pawns and a big centre, then bully Black's knights home with d4–e5. A shock weapon with a roaring initiative — though with accurate defence Black is objectively better.",
    notes:["King's pawn — the most popular start.","Black mirrors: the Open Game.","Develop the knight and hit e5.","Black defends e5.","The Four Knights — but White has a shock ready.","Black develops the second knight; all looks normal…","Nxe5! The Halloween — a whole knight for the centre.","Black accepts (declining just leaves White slightly better).","The point: d4 forks the e5-knight and seizes the centre.","The knight retreats to g6.","e5! The second pawn rolls up and kicks the f6-knight.","The knight is shoved all the way home — White's gained huge time.","Pour everything in. Two pawns, a big centre, and every piece aimed at f7 while Black’s sit at home. Dubious if Black defends perfectly — but over the board, almost nobody does. Blitz poison."],
    plans:"You gave a knight for two centre pawns and a lead in development. Castle fast, aim everything at f7, and open lines before Black untangles. Be honest: with accurate defence Black is better — this shines most in blitz.",
    arrows:{ 9:[["d4","e5"]], 11:[["e5","f6"]], 13:[["c4","f7"]] },
    vars:[
      { name:"Critical (5...Ng6 6.e5)", line:["e4","e5","Nf3","Nc6","Nc3","Nf6","Nxe5","Nxe5","d4","Ng6","e5","Ng8","d5"],
        idea:"The knight retreats to g6; White keeps rolling with e5 then d5, clamping the centre and grabbing maximum space for the piece.",
        notes:["King's pawn opening.","The Open Game.","Develop and hit e5.","Defend e5.","The Four Knights setup.","Both knights are out.","Nxe5! the sacrifice.","Black takes the knight.","d4 forks the e5-knight.","The knight backs up to g6.","e5 kicks the f6-knight.","Shoved all the way home.","d5! Clamp the centre and deny Black's knight squares. Huge space — but White is still a piece down, so Black is better."],
        plans:"Use the space to keep Black boxed in: d5, Bc4/Bd3, castle, then storm the kingside. Convert the initiative quickly — if Black consolidates, the extra piece tells.",
        arrows:{ 9:[["d4","e5"]], 11:[["e5","f6"]], 13:[["d5","c6"]] } },
      { name:"Greedy knight (5...Nc6)", line:["e4","e5","Nf3","Nc6","Nc3","Nf6","Nxe5","Nxe5","d4","Nc6","d5","Ne5","f4"],
        idea:"If the knight drops back to c6, d5 then f4 chase it again — White's pawns steamroll the centre and grab even more time.",
        notes:["King's pawn opening.","The Open Game.","Develop and hit e5.","Defend e5.","The Four Knights setup.","Both knights are out.","Nxe5! the sacrifice.","Black takes.","d4 forks the knight.","The knight retreats to c6 instead.","d5! attacks the c6-knight at once.","The knight hops to e5.","f4! kicks it again — the pawns roll forward with tempo. A big centre and initiative, but still down a piece."],
        plans:"Keep chasing with gain of time, build the pawn centre, and open lines toward f7. As ever in the Halloween: attack fast, because the material favours Black.",
        arrows:{ 9:[["d4","e5"]], 11:[["d5","c6"]], 13:[["f4","e5"]] } },
    ] },
  { name:"Tennison Gambit", eco:"A06", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","d5","Nf3","dxe4","Ng5","Nf6","d3","exd3","Bxd3","h6","Nxf7","Kxf7","Bg6+","Kxg6","Qxd8"],
    idea:"The 'rocket' gambit, with its famous payoff up front. Gambit the e-pawn; the knight rockets to g5 eyeing f7. If Black plays the natural-looking …h6 to kick it, Nxf7! then Bg6+! drag the king out and win the queen on d8.",
    notes:["King's pawn opening.","…d5 strikes the centre.","Develop, don't recapture.","…dxe4 grabs the pawn.","The knight eyes f7.","…Nf6 defends e4.","Undermine e4.","…exd3.","Recapture; now watch Black's natural move.","Kicking the knight looks obvious, but it loses.","Nxf7! The knight crashes in, forking the d8-queen and h8-rook.","The king has to take.","Bg6+!! A second offer lures the king onto g6.","Forced.","The d-file is open and White grabs the queen. Winning: a knight and bishop given, but the whole queen (and a bare king) in return."],
    plans:"Gambit the e-pawn for fast development and play at f7 and h7. If Black kicks the knight with …h6, punish it with Nxf7! and Bg6+! every time. If Black avoids …h6, just develop and press f7 — the queen-grab is the bonus, not the whole plan.",
    arrows:{ 5:[["g5","f7"]], 11:[["f7","d8"],["f7","h8"]], 13:[["d3","g6"]], 15:[["d1","d8"]] },
    vars:[
      { name:"The sound line (…Nc6)", line:["e4","d5","Nf3","dxe4","Ng5","Nf6","d3","exd3","Bxd3","Nc6","O-O"],
        idea:"If Black develops calmly with …Nc6 instead of grabbing with …h6, there's no queen to win — but you still get the fast, easy attacking setup the gambit is built for.",
        notes:["King's pawn — the most popular start.","Black strikes the centre at once.","Don't recapture: develop, and the knight heads for g5.","Black grabs the pawn.","The rocket! The knight jumps to g5, eyeing f7 and the e4-pawn.","Black defends e4 and develops.","Undermine the extra pawn.","Black gives it back.","Recapture; the bishop rakes at h7 and the knight glares at f7.","Black develops.","Castle. The pawn's back, development's done, and play flows at f7/h7. About equal, but far easier for White."],
        plans:"You gambited the e-pawn for a lead in development and quick play at f7 and h7. Castle, swing the queen and rooks toward the centre, and hunt tactics on the light squares. Roughly equal — but much easier to handle as White.",
        arrows:{ 5:[["g5","f7"]], 9:[["d3","h7"]] } },
    ] },
  { name:"Evans Gambit", video:{ id:"ykjowp6waXA", title:"Evans Gambit: Crush Sub-1500", author:"Remote Chess Academy", length:"15 min" }, eco:"C52", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Nf3","Nc6","Bc4","Bc5","b4","Bxb4","c3","Ba5","d4","exd4","O-O","Nge7","cxd4","d5","exd5","Nxd5","Ba3"],
    idea:"Sacrifice the b-pawn to drag Black's bishop offside, then build a huge c3+d4 centre and aim everything at f7. The real goal: get so far ahead in development that Black's king gets stuck in the centre. A favourite of Morphy, Anderssen and Kasparov.",
    notes:["King's pawn, the most popular start.","Black mirrors: the Open Game.","Develop and hit e5.","Black defends e5.","The Italian bishop, already eyeing f7.","The Giuoco Piano.","b4!? The Evans Gambit — offer the b-pawn to deflect the c5-bishop off the a7–g1 diagonal.","Black accepts the pawn.","Gain a tempo on the bishop and, above all, prepare d4.","The bishop slides back, still eyeing the e1-king.","d4! The whole point of the gambit: rip open the centre while you're ahead in development.","Black grabs the pawn. You're a pawn down now — but watch what you get for it.","Castle first: king safe, rook eyeing the e- and f-files.","Black develops and shores up the kingside.","Recapture. Now you have a textbook big centre (d4 + e4) and you're down only the one pawn.","Black hits back at your centre, the principled try.","Open the e-file straight toward Black's king.","Black recaptures.","Ba3!! The move that makes the gambit. It covers f8, so Black can never castle kingside — the king is stuck in the centre while your rooks and queen pour in. THIS is what the pawn bought (the engine calls the position dead level — your activity fully replaces the pawn)."],
    plans:"Your development lead is everything — Black's king is trapped in the centre. Bring up the last pieces with tempo: Re1 down the open e-file, Qb3 or Qe2 leaning on f7 and e6, then Nc3 and Rad1. The breaks d4–d5 and sacrifices on f7/e6 blow it open before Black can untangle. A pawn down, with a roaring initiative — pure Morphy chess.",
    arrows:{ 5:[["c4","f7"]], 7:[["b4","c5"]], 11:[["d4","e5"]], 19:[["a3","f8"]] },
    vars:[
      { name:"Compromised Defence (Black grabs everything)", line:["e4","e5","Nf3","Nc6","Bc4","Bc5","b4","Bxb4","c3","Ba5","d4","exd4","O-O","dxc3","Qb3","Qf6","e5","Qg6","Nxc3"],
        idea:"The sharpest test: Black snatches the c3-pawn too (…dxc3), going two pawns up. White ignores it and develops with hammer-blows at f7 — and astonishingly the engine rates WHITE better. The two pawns mean nothing against the lead in development.",
        notes:["King's pawn.","The Open Game.","Hit e5.","Defend e5.","Eye f7.","Giuoco Piano.","b4!? the Evans offer.","Accepted.","Tempo, prepare d4.","Retreat.","d4! open the centre.","Black grabs (a pawn up).","Castle.","Black gets greedy and takes a SECOND pawn. Now you invest heavily for the attack.","Qb3! Double-barrelled: with the c4-bishop it threatens mate on f7, and it also hits b7. Black must drop everything to defend f7.","The one good defence of f7.","e5! Kick the queen and tear the position open with tempo.","The queen steps back but still guards f7.","Scoop the pawn back and finish developing. On the scoreboard you're down a pawn or two — but every piece is firing and Black is in a tangle. (Engine: White is actually better.)"],
        plans:"Pour it on: Ba3 to stop …O-O, then Rad1, Ne4 hitting the g6-queen and the d6/f6 squares, and sacrifices on f7. The pawns are irrelevant — Black can barely move. This is the line that made the Evans immortal.",
        arrows:{ 5:[["c4","f7"]], 15:[["b3","f7"],["b3","b7"]], 17:[["e5","f6"]], 19:[["c3","d5"]] } },
      { name:"Declined (4...Bb6)", line:["e4","e5","Nf3","Nc6","Bc4","Bc5","b4","Bb6","a4","a6","Nc3"],
        idea:"Declining keeps it calmer, but White grabs queenside space with a4 (threatening a5 to harass the bishop) and develops freely — a risk-free edge.",
        notes:["King's pawn opening.","The Open Game.","Develop and hit e5.","Defend e5.","The Italian bishop, eyeing f7.","Giuoco Piano.","b4!? the Evans offer.","Black declines, tucking the bishop safely back.","a4! grab queenside space and eye a5 to harass the bishop.","Black stops a5 and makes luft.","Develop. White's sacrificed nothing and has more space and easy play — a small, comfortable edge."],
        plans:"No sacrifice needed: enjoy the free queenside space (a4–a5 ideas), develop smoothly, and keep nagging at f7. A pleasant, low-risk plus.",
        arrows:{ 5:[["c4","f7"]], 7:[["b4","c5"]] } },
    ] },
  { name:"Scotch Gambit", video:{ id:"QEYybZ8FYGE", title:"Scotch Gambit Guide", author:"Remote Chess Academy", length:"20 min" }, eco:"C44", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Nf3","Nc6","d4","exd4","Bc4","Bc5","c3","Nf6","cxd4","Bb4+","Nc3"],
    idea:"Offer the d4-pawn to develop with tempo and aim the bishop at f7. With c3 you hit back at the centre and usually win the pawn straight back, ending up with a broad centre and a lead in development. Far less theory than the main Scotch.",
    notes:["King's pawn — the most popular start.","Black mirrors: the Open Game.","Develop and hit e5.","Black defends e5.","Strike the centre at once.","Black captures.","The Scotch Gambit: leave the d4-pawn for now, develop fast and eye f7.","Black develops actively, holding the extra pawn.","Challenge the d4-pawn and prise the centre open.","Black develops and hits e4.","Win the pawn back. Now you have a big e4+d4 centre, and the pawn also hits the c5-bishop.","The bishop steps aside with check.","Block and develop. White has a strong centre, a lead in development, and pressure building on f7. Roughly level, but White's game is the easier one to play."],
    plans:"Your lead in development is the point. Play c3 to challenge Black's extra pawn; after cxd4 you get a broad e4+d4 centre and quick development. Castle, use the open lines, and keep an eye on f7.",
    arrows:{ 5:[["d4","e5"]], 7:[["c4","f7"]], 9:[["c3","d4"]], 11:[["d4","c5"]] },
    vars:[
      { name:"Two-pawn punch (4…Bc5 5.c3 dxc3)", line:["e4","e5","Nf3","Nc6","d4","exd4","Bc4","Bc5","c3","dxc3","Nxc3"],
        idea:"White offers a SECOND pawn for a raging initiative and a big lead in development aimed straight at f7.",
        notes:["King's pawn opening.","The Open Game.","Develop and hit e5.","Defend e5.","d4! strike the centre.","…exd4 captures.","Scotch Gambit, eyeing f7.","Black develops, holding the d4-pawn.","c3! Offer a second pawn to blow the position wide open.","Black grabs it.","Recapture. Two pawns invested for open lines, a big development lead and pressure on f7 — a powerful practical initiative."],
        plans:"Two pawns for a huge lead in development aimed at f7. Castle, line up Qb3 and Ng5, and open the centre before Black untangles. Pure initiative — convert it fast.",
        arrows:{ 5:[["d4","e5"]], 7:[["c4","f7"]], 9:[["c3","d4"]] } },
      { name:"Max Lange Attack (4…Nf6 5.O-O)", line:["e4","e5","Nf3","Nc6","d4","exd4","Bc4","Nf6","O-O","Bc5","e5","d5"],
        idea:"If Black develops with 4…Nf6, castle and push e5 — the famous, razor-sharp Max Lange Attack. White ignores the d4-pawn entirely and storms f7 and the e-file.",
        notes:["King's pawn — the most popular start.","Black mirrors: the Open Game.","Develop and hit e5.","Black defends e5.","Strike the centre at once.","Black captures.","The Scotch Gambit: leave the d4-pawn, develop fast and eye f7.","Black develops and hits e4.","Castle; the d4-pawn can wait.","Black develops actively; now we enter the Max Lange.","Kick the f6-knight and grab space.","The key defence: block the pawn and hit the c4-bishop. Famously sharp, roughly equal, but White does the attacking."],
        plans:"Your lead in development is the trump card. Castle, push e5 backed by Re1, and pile onto f7 and the e-file. The Max Lange is sharp and about equal, but White is the one attacking.",
        arrows:{ 5:[["d4","e5"]], 7:[["c4","f7"]], 11:[["e5","f6"]] } },
    ] },
  { name:"King's Gambit", eco:"C37", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","f4","exf4","Nf3","g5","Bc4","g4","O-O","gxf3","Qxf3","Qf6","d3","Bh6","Nc3"],
    idea:"The romantic classic. Offer the f-pawn to blast open the f-file; this Muzio line even throws in a knight for a screaming attack on f7. Pure fireworks — and objectively risky.",
    notes:["King's pawn — the most popular start.","Black mirrors: the Open Game.","f4!? The King's Gambit — offer the f-pawn to rip open the f-file.","Black accepts.","Develop and stop the …Qh4+ check.","Black clings to the extra pawn.","Eye f7 and prepare to castle.","Black kicks the f3-knight, expecting it to move…","O-O!! The Muzio — castle and let the knight go!","Black takes the knight.","A whole knight for the open f-file, a big lead in development, and a bullseye on f7.","Black defends f7 and eyes the f4-pawn and the long diagonal.","Open the c1-bishop and clamp the centre.","Black defends the f4-pawn and develops.","Every white piece joins in. Down a knight for a pawn, but the development lead and pressure on f7 give full compensation; objectively risky, but ferocious."],
    plans:"You gave a knight for an overwhelming initiative: open f-file, fast development, f7 in your sights. Play d4, Bxf4, Nc3, double on the f-file, and mate before Black untangles. Objectively risky — but terrifying to face.",
    arrows:{ 3:[["f4","e5"]], 7:[["c4","f7"]], 11:[["f3","f7"]] },
    vars:[
      { name:"Declined (2...Bc5)", line:["e4","e5","f4","Bc5","Nf3","d6","Nc3","Nf6"],
        idea:"Black declines and plants the bishop on the strong a7–g1 diagonal, targeting f2 and the king rather than grabbing the pawn.",
        notes:["King's pawn opening.","The Open Game.","f4!? the King's Gambit.","Black declines, eyeing f2 and the a7–g1 diagonal (and …Qh4+ ideas).","Develop and cover h4.","Support e5 and open the bishop's diagonal.","Develop the knight.","Both sides develop calmly. Roughly balanced: watch f2 and the diagonal, but keep your healthy centre."],
        plans:"Don't force it: develop soundly (Nc3, d3 or fxe5), mind the f2-square and the …Qh4+ idea, and aim for d4 under good conditions. A normal, roughly equal game.",
        arrows:{ 3:[["f4","e5"]], 4:[["c5","g1"]] } },
      { name:"Falkbeer Counter-Gambit (2...d5)", line:["e4","e5","f4","d5","exd5","e4","d3","Nf6"],
        idea:"Black counter-gambits! Instead of grabbing the f-pawn, Black strikes the centre with …d5 and …e4 to seize the initiative.",
        notes:["King's pawn opening.","The Open Game.","f4!? the King's Gambit.","…d5! The Falkbeer — Black hits back in the centre.","Take the d-pawn.","…e4! Black pushes by, grabbing space with a cramping pawn rather than recapturing.","Challenge the advanced e4-pawn at once.","Black develops, eyeing d5 and the centre. Sharp and roughly balanced; modern theory gives White a small edge after d3."],
        plans:"Meet the counter head-on: d3 to undermine e4, develop fast (Nd2, Ngf3), and hand the extra pawn back if it frees your game. Sharp, but objectively fine for White.",
        arrows:{ 3:[["f4","e5"]], 4:[["d5","e4"]], 7:[["d3","e4"]] } },
    ] },
  { name:"Danish Gambit", video:{ id:"WBAxtec_clo", title:"Danish Gambit Explained", author:"Andras Toth", length:"20 min" }, eco:"C21", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","d4","exd4","c3","dxc3","Bc4","cxb2","Bxb2"],
    idea:"Give up TWO pawns for two raking bishops on the long diagonals aimed at f7 and g7, plus a massive lead in development. All-out romantic attack.",
    notes:["King's pawn — the most popular start.","Black mirrors: the Open Game.","Strike the centre at once.","Black captures.","c3!? The Danish — offer the c-pawn to open lines.","Black grabs it.","Develop, aim at f7, and offer ANOTHER pawn.","Black takes the second pawn.","Two pawns gone, but two bishops rake f7 and g7 with a huge development lead. Ferocious — though …d5 lets Black equalize."],
    plans:"Two pawns for two monster bishops on the long diagonals and a big lead in development. Castle, line up Qb3/Qe2 and the rooks on the centre files, and storm f7/g7. Best defence (…d5) equalizes — so attack fast.",
    arrows:{ 7:[["c4","f7"]], 9:[["b2","g7"]] },
    vars:[
      { name:"Modern antidote (…d5)", line:["e4","e5","d4","exd4","c3","dxc3","Bc4","cxb2","Bxb2","d5"],
        idea:"Black returns one pawn with …d5 to blunt both raking bishops and free their game — the recommended defence.",
        notes:["King's pawn opening.","The Open Game.","Strike the centre.","…exd4 captures.","c3!? the Danish offer.","…dxc3 grabs.","Eye f7, offer a second pawn.","Black takes it.","Two bishops rake f7 and g7.","…d5! The antidote: give a pawn back to slam the door on both bishops. White stays a touch more active, but Black is essentially equal."],
        plans:"Even against the antidote, recapture (Bxd5 or exd5), develop with tempo, and use the open lines — but accept that accurate play equalizes. Pleasant, not winning.",
        arrows:{ 7:[["c4","f7"]], 9:[["b2","g7"]], 10:[["d5","c4"]] } },
      { name:"Declined (3...d5)", line:["e4","e5","d4","exd4","c3","d5","exd5","Qxd5","cxd4","Nc6"],
        idea:"Black declines and counterpunches in the centre, reaching a balanced open game with an isolated d-pawn for White.",
        notes:["King's pawn opening.","The Open Game.","Strike the centre.","…exd4 captures.","c3!? the Danish offer.","…d5! Black declines and hits back in the centre.","Take the d-pawn.","The queen recaptures, centralized.","Regain the gambit pawn; White gets an isolated d-pawn.","Black develops and hits d4. A balanced open game: White has easy development, Black the safer structure."],
        plans:"A normal isolated-queen's-pawn middlegame: develop actively (Nf3, Nc3, Bc4/Be2), use the d-pawn for space and piece activity, and watch the d4-square. Equal but comfortable.",
        arrows:{ 3:[["d4","e5"]], 6:[["d5","e4"]] } },
    ] },
  { name:"Smith-Morra Gambit", video:{ id:"VEZ0H-g6U-8", title:"Smith-Morra Gambit Traps", author:"Remote Chess Academy", length:"lesson" }, eco:"B21", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","c5","d4","cxd4","c3","dxc3","Nxc3","Nc6","Nf3","d6","Bc4","e6","O-O"],
    idea:"A clean anti-Sicilian weapon: sacrifice a pawn for fast development and the open c- and d-files. Easy, repeatable attacking plans against 1…c5.",
    notes:["King's pawn — the most popular start.","The Sicilian, Black's most combative reply.","Strike at once instead of the main Open Sicilian.","Black captures.","c3!? The Smith-Morra — offer the pawn to open lines fast.","Black grabs it.","Recapture; the knight develops with tempo toward d5/b5.","Black develops.","Develop and eye d4/e5.","Black builds the solid Sicilian wall.","The key bishop, aimed at f7 and e6.","Black blunts the bishop.","Castle. A pawn for a big lead in development and the open c/d-files. Lasting, easy pressure — superb at club level."],
    plans:"The Morra is a system: Bc4, O-O, Qe2, Rfd1 and Rac1, then strike with e5 or Nd5/Nb5. You aim at f7, e6 and d6 down the open files. A pawn for a durable initiative — Black must defend precisely.",
    arrows:{ 7:[["c3","d5"]], 11:[["c4","f7"]] },
    vars:[
      { name:"Main development", line:["e4","c5","d4","cxd4","c3","dxc3","Nxc3","Nc6","Nf3","d6","Bc4","e6","O-O","Nf6"],
        idea:"Black develops solidly; White piles up on the half-open c- and d-files and eyes the e5/d5 breaks.",
        notes:["King's pawn opening.","The Sicilian.","Strike at once.","…cxd4 captures.","c3!? the Morra offer.","…dxc3 grabs.","Develop with tempo.","…Nc6 develops.","Eye d4/e5.","The Sicilian wall.","Aim at f7/e6.","…e6 blunts the bishop.","Castle into the setup.","Black completes development; White lines up Qe2, Rfd1, Rac1 and looks for e5 or Nd5/Nb5. Full, easy compensation for the pawn."],
        plans:"Finish the system (Qe2, Rfd1, Rac1, Bf4/Bg5), then break with e5 or jump Nd5/Nb5. Constant pressure on f7, e6 and d6 — keep Black passive and pile on.",
        arrows:{ 11:[["c4","f7"]], 13:[["f3","e5"]] } },
      { name:"Declined (3...Nf6)", line:["e4","c5","d4","cxd4","c3","Nf6","e5","Nd5","Nf3","Nc6"],
        idea:"Black declines with …Nf6, hitting e4; White grabs space with e5 and transposes to a comfortable Alapin-style game with a small, safe edge.",
        notes:["King's pawn opening.","The Sicilian.","Strike at once.","…cxd4 captures.","c3!? the Morra offer.","…Nf6! Black declines, hitting e4 instead of grabbing c3.","Push, gain space, kick the knight.","The knight hops to d5.","Develop and prepare to regain d4.","Black develops. White plays cxd4 with a pleasant space edge (Alapin-style) — a small, safe plus rather than a gambit."],
        plans:"Transpose to a comfortable Alapin: e5 for space, recapture on d4, develop naturally (Bc4/Be2, O-O, Nc3), and press with the central majority. A risk-free edge.",
        arrows:{ 3:[["d4","c5"]], 7:[["e5","f6"]] } },
    ] },
  { name:"Fried Liver Attack", eco:"C57", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Nf3","Nc6","Bc4","Nf6","Ng5","d5","exd5","Nxd5","Nxf7","Kxf7","Qf3","Ke6","Nc3"],
    idea:"If Black greedily recaptures with 5…Nxd5, sacrifice the knight on f7 to drag the king into the open and hunt it with Qf3+ and Nc3. Every attacker should know it.",
    notes:["King's pawn — the most popular start.","Black mirrors: the Open Game.","Develop and hit e5.","Black defends e5.","The Italian bishop, eyeing f7.","Black develops and hits e4 (the Two Knights).","Ng5!? The knight pounces toward f7 — crude, but venomous against the wrong reply.","Black's best: block the bishop and hit e4.","Take the pawn.","…Nxd5?! The greedy recapture (5…Na5! is safer) — straight into the Fried Liver.","Nxf7!! The knight sacrifices itself, ripping open the king.","The king must take.","The point: check and fork the stranded d5-knight, starting the king hunt.","The king bravely defends d5 (the only way to hold).","Pile in: hammer d5 again, then d4 and Re1+. A raging attack — Black must find a string of only-moves to survive (and objectively can)."],
    plans:"After the sac, hunt: Qf3+ regains the d5-knight or drives the king up, then Nc3, d4, Re1 and the queen close in. Practically terrifying — but perfect defence (…Ke6!) holds. A blitz killer.",
    arrows:{ 5:[["c4","f7"]], 7:[["g5","f7"]], 13:[["f3","d5"]], 15:[["c3","d5"]] },
    vars:[
      { name:"Black's safe defence (5...Na5!)", line:["e4","e5","Nf3","Nc6","Bc4","Nf6","Ng5","d5","exd5","Na5","Bb5+","c6","dxc6","bxc6"],
        idea:"The correct way to AVOID the Fried Liver: 5…Na5! hits the bishop and sidesteps the sac. Worth knowing from both sides.",
        notes:["King's pawn opening.","The Open Game.","Develop and hit e5.","Defend e5.","The Italian bishop, eyeing f7.","The Two Knights.","Ng5!? pounce toward f7.","Block the bishop, hit e4.","Take the pawn.","…Na5! The safe defence: hit the c4-bishop and refuse the sac.","Check instead of retreating.","Block the check and chip at the bishop.","Grab a pawn.","Recapture. Black is a pawn down but has the bishop pair, fast development and open lines — full, well-known compensation. Roughly equal."],
        plans:"If Black plays the safe 5…Na5, don't panic — you're up a pawn but Black has the bishop pair and activity. Develop solidly (Be2, d3, O-O, Nc3), return the pawn if needed, and blunt Black's lead. Roughly level.",
        arrows:{ 5:[["c4","f7"]], 7:[["g5","f7"]], 10:[["a5","c4"]] } },
    ] },
  // ─────────────── more main openings ───────────────
  { name:"Petrov (Russian) Defense", eco:"C42", side:"b", cat:"Defenses to 1. e4",
    line:["e4","e5","Nf3","Nf6","Nxe5","d6","Nf3","Nxe4","d4","d5"],
    idea:"Instead of defending e5, Black copies with 2…Nf6 and counter-attacks e4. The Petrov is famously solid and symmetrical — a favourite of players who want a quiet, rock-solid game with Black.",
    notes:["The most popular first move.","Black meets it head-on.","Develop and attack e5.","…Nf6!? The Petrov: ignore the threat and hit e4 right back.","White grabs the pawn (the main line).","Don't recapture yet; first kick the knight (2…Nxe4?? 3.Qe2 loses material).","The knight retreats.","Now Black takes, restoring material.","White builds a centre and opens lines.","Black props up the e4-knight and grabs central space. A symmetrical, super-solid position — equal and hard to crack."],
    plans:"Symmetrical and solid. Both sides develop naturally (Bd3, O-O, c4 for White; Bd6/Be7, O-O for Black). White nudges for a tiny edge with extra space; Black neutralises and heads for a comfortable, level middlegame." },
  { name:"Philidor Defense", eco:"C41", side:"b", cat:"Defenses to 1. e4",
    line:["e4","e5","Nf3","d6","d4","exd4","Nxd4","Nf6","Nc3","Be7"],
    idea:"A solid but passive way to defend e5: 2…d6 props up the pawn. Cramped yet sturdy — easy to understand and tough for White to crack open.",
    notes:["King's pawn.","The Open Game.","Attack e5.","The Philidor: defend e5 with the pawn instead of a piece.","Strike the centre at once.","Black gives up the centre (the modern …Nbd7 first is sturdier).","Recapture; White has a free classical centre.","Develop and hit e4.","Defend e4 and develop.","A modest, solid set-up, ready to castle. Black is cramped but very solid."],
    plans:"White enjoys more space and easy development (Be2/Bc4, O-O, queenside expansion). Black sits behind a sturdy wall, finishes developing, and looks for a freeing …d5 or …c5 break later. Slightly better for White, but tough to break down." },
  { name:"Pirc Defense", video:{ id:"nBYZ_H6u_9c", title:"Pirc Defense for Black", author:"Remote Chess Academy", length:"lesson" }, eco:"B07", side:"b", cat:"Defenses to 1. e4",
    line:["e4","d6","d4","Nf6","Nc3","g6","Nf3","Bg7","Be2","O-O"],
    idea:"A hypermodern defence: Black lets White build a big centre, then attacks it with pieces and a fianchettoed g7-bishop. Flexible and combative.",
    notes:["King's pawn.","A flexible move; Black delays committing the centre.","White happily takes the big centre.","Hit e4 and develop.","Defend e4.","Prepare to fianchetto, the heart of the Pirc.","Develop.","The bishop eyes the long diagonal and White's centre.","Quiet development (the sharp Austrian Attack uses f4 instead).","Black castles, set up to strike with …e5 or …c5. Double-edged play."],
    plans:"White has a big space advantage and can attack on the kingside (especially with f4 ideas). Black castles, then chips at the centre with …e5 or …c5 and uses the g7-bishop's pressure on the long diagonal. Rich, unbalanced middlegames." },
  { name:"Modern Defense", eco:"B06", side:"b", cat:"Defenses to 1. e4",
    line:["e4","g6","d4","Bg7","Nc3","d6","Nf3","a6"],
    idea:"Even more flexible than the Pirc — Black fianchettoes immediately and keeps options open, inviting White to overextend. A favourite of creative, provocative players.",
    notes:["King's pawn.","The Modern: say little and prepare the fianchetto.","White takes the centre.","The bishop rakes the long diagonal at White's centre.","Support e4 and develop.","Keep the centre flexible and open the bishop's diagonal.","Develop.","A typical Modern move, preparing …b5 and queenside expansion before committing. Provocative and flexible."],
    plans:"White builds a broad centre and more space; Black stays compact and counter-punches with …c5, …b5 and pressure from the g7-bishop, hoping White overextends. Very flexible — can transpose to the Pirc." },
  { name:"Alekhine Defense", eco:"B02", side:"b", cat:"Defenses to 1. e4",
    line:["e4","Nf6","e5","Nd5","d4","d6","Nf3","g6"],
    idea:"The ultimate provocation: 1…Nf6 dares White to chase the knight with pawns, then Black attacks the over-extended centre. Hypermodern and tricky.",
    notes:["King's pawn.","…Nf6!? The Alekhine: provoke the pawns forward by hitting e4 at once.","White obliges, kicking the knight and grabbing space.","The knight hops to a good square.","White builds a huge pawn centre (the whole point).","Black starts chipping at the e5-pawn immediately.","Defend e5.","Fianchetto to add pressure. Black bets the big centre becomes a weakness."],
    plans:"White grabs lots of space (the 'Four Pawns' set-ups are most ambitious) and tries to use it; Black undermines with …dxe5, …c5 and piece pressure, aiming to prove the centre is overextended. Sharp and asymmetrical." },
  { name:"Four Knights Game", eco:"C47", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","e5","Nf3","Nc6","Nc3","Nf6","Bb5","Bb4","O-O","O-O"],
    idea:"Both sides develop all their knights, then mirror with bishops. Classical, symmetrical and very sound — a great way to reach a clean, principled middlegame.",
    notes:["King's pawn.","The Open Game.","Develop and hit e5.","Defend e5.","Develop the other knight (the Four Knights).","Black mirrors, hitting e4.","The Spanish-style pin on the c6-knight.","Black copies, pinning the c3-knight.","Castle into safety.","Black castles too. A symmetrical, classical position where small plans and good technique decide."],
    plans:"Classical development is the theme. Typical ideas: Bxc6 to damage the structure, d3 and Bg5 pinning, or a slow build-up with Nd5. Symmetry means understanding the small imbalances matters more than memorising." },
  { name:"Bishop's Opening", eco:"C24", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","e5","Bc4","Nf6","d3","c6","Nf3","d5"],
    idea:"A quiet but flexible opening: the bishop goes straight to c4 eyeing f7, and White often transposes into Italian-style positions. Avoids a lot of theory.",
    notes:["King's pawn.","The Open Game.","The Bishop's Opening: develop the bishop at once, aiming at f7.","Develop and hit e4.","Calmly defend e4 (the modern, solid approach).","Black prepares …d5 to challenge the centre.","Develop (often transposing toward the Italian).","Black strikes in the centre. A flexible, low-theory game with chances for both sides."],
    plans:"Flexible and transpositional. White develops naturally (Nf3, O-O, Nbd2, c3) and often steers into Giuoco-Piano structures, manoeuvring toward a d4 break. Comfortable, low-risk chess." },
  { name:"Grünfeld Defense", video:{ id:"QdUKFEH58GE", title:"Grünfeld Defense for Black", author:"Remote Chess Academy", length:"lesson" }, eco:"D85", side:"b", cat:"Defenses to 1. d4",
    line:["d4","Nf6","c4","g6","Nc3","d5","cxd5","Nxd5","e4","Nxc3","bxc3","Bg7"],
    idea:"A hypermodern counter-attack: Black lets White build a huge pawn centre, then blasts at it with the g7-bishop and …c5. Dynamic and theory-rich, beloved at the top level.",
    notes:["Queen's pawn.","Develop and control e4.","White grabs space.","Prepare the fianchetto.","Develop and prepare e4.","The Grünfeld idea: strike the centre instead of blockading it.","White captures.","Recapture with the knight.","Kick the knight and build the big centre.","Trade off the defender.","Recapture; White has a massive pawn centre…","…which the bishop and …c5 will hammer. Black bets the centre becomes a target. Double-edged."],
    plans:"White gets an imposing pawn centre and space — the game is whether it's strong or overextended. Black pressures it with …c5, …Bg7, …Qa5/…Nc6 and queenside play. One of the most respected defences to 1.d4." },
  { name:"Dutch Defense", video:{ id:"m4TpwMWIoyw", title:"Dutch Defense vs 1.d4", author:"Remote Chess Academy", length:"lesson" }, eco:"A80", side:"b", cat:"Defenses to 1. d4",
    line:["d4","f5","g3","Nf6","Bg2","e6","Nf3","Be7"],
    idea:"An aggressive answer to 1.d4: 1…f5 grabs kingside space and aims for a direct attack. Sharper and riskier than most d4 defences.",
    notes:["Queen's pawn.","…f5!? The Dutch: stake out the kingside and prepare an attack.","White fianchettoes to blunt the f5-pawn's diagonal (the main antidote).","Develop and control e4.","The bishop eyes the long light diagonal.","Open the bishop and support …d5/…f-file play.","Develop.","A flexible Classical set-up, ready to castle and push for a kingside attack. Sharp and ambitious."],
    plans:"Black grabs kingside space and aims for attacks with …e5 breaks or a Stonewall (…d5, …c6, …Bd6). White's g3 set-up pressures the slightly loosened light squares and the centre. Double-edged and combative." },
  { name:"Catalan Opening", video:{ id:"QYZu2HBP0PE", title:"Catalan: Solid 1.d4 System", author:"Remote Chess Academy", length:"lesson" }, eco:"E00", side:"w", cat:"1. d4 — Queen's Pawn",
    line:["d4","Nf6","c4","e6","g3","d5","Bg2","Be7"],
    idea:"A powerful positional weapon: White mixes a Queen's-Gambit centre with a fianchettoed bishop on g2, generating long-term pressure down the long diagonal. A favourite of patient, strategic players.",
    notes:["Queen's pawn.","Develop.","The Queen's-Gambit space grab.","Solid; opens the f8-bishop.","The Catalan: fianchetto the king's bishop for long-term pressure.","Black challenges the centre.","The Catalan bishop rakes the long diagonal toward c6/b7.","Black develops solidly toward castling. White gets lasting pressure for the gambited c4-pawn in some lines."],
    plans:"White plays for long-term pressure: Bg2 down the long diagonal, O-O, Qc2/Rd1, and recovering or pressing on the c4-pawn. Black frees up with …dxc4 and …c5 or …b5. A strategic, grind-them-down opening." },
  // ─────────────── more gambits & traps ───────────────
  { name:"Latvian Gambit", eco:"C40", side:"b", cat:"⚔️ Gambits — as Black",
    line:["e4","e5","Nf3","f5","Nxe5","Qf6","d4","d6","Nc4","fxe4"],
    idea:"A wild, dubious-but-fun mirror of the King's Gambit — with Black! 2…f5 throws a pawn at White's centre for a violent attack. Unsound at the top, deadly in blitz.",
    notes:["King's pawn.","The Open Game.","Attack e5.","…f5!? The Latvian Gambit — Black counter-gambits, hitting e4 and the f-file. Risky, but a fierce surprise.","White grabs the pawn, the critical test.","Hit the e5-knight and eye the open f-file.","Defend the knight and grab the centre.","Kick the knight again.","The knight retreats to safety.","Black wins the pawn back, the f-file flies open, and the pieces pour out. Objectively dubious — but the Latvian is pure chaos, and one careless move by White lets Black’s attack crash through."],
    plans:"Pure attack: open the f-file and throw the queen and pieces at White's king before the extra material tells. Know White is theoretically better — so this is a practical try, best in fast games. Trade soundness for chaos." },
  { name:"Elephant Gambit", eco:"C40", side:"b", cat:"⚔️ Gambits — as Black",
    line:["e4","e5","Nf3","d5","exd5","e4","Qe2","Qe7","Nd4","Nf6"],
    idea:"A cheeky offbeat gambit: 2…d5 strikes the centre immediately, gambiting a pawn for quick development and surprise value. Dubious but tricky.",
    notes:["King's pawn.","The Open Game.","Attack e5.","…d5!? The Elephant Gambit — strike the centre at once.","White grabs the pawn.","Gain space and kick the f3-knight.","Pin and attack the e4-pawn.","Defend e4 and prepare to develop.","The knight hops to safety.","Develop fast and lean on the e4 wedge. Down a pawn and objectively worse, yet the Elephant throws White out of book on move two — a cheeky surprise that thrives on unfamiliar ground."],
    plans:"Develop quickly and open lines (…Bd6, …Nf6, …O-O) to justify the pawn. White is theoretically better, so play it for the surprise and the open, tactical positions. A practical blitz weapon." },
  { name:"Fishing Pole Trap", eco:"C65", side:"b", cat:"⚔️ Gambits — as Black",
    line:["e4","e5","Nf3","Nc6","Bb5","Nf6","O-O","Ng4","h3","h5","hxg4","hxg4","Ne1","Qh4","Qf3","gxf3","Nxf3","Qh1#"],
    idea:"A devilish trap in the Ruy López: Black dangles the g4-knight as bait. If White grabs it with hxg4??, …hxg4 rips open the h-file and the queen and rook crash through for mate.",
    notes:["King's pawn.","The Open Game.","Develop and hit e5.","Defend e5.","The Ruy López.","Develop and hit e4.","White castles.","The fishing pole: the knight lunges at h2, looking greedy.","White questions the knight…","The hook! Black offers the knight to lure hxg4.","White bites. This is the losing mistake (White had to decline with d3 or Re1).","The h-file rips wide open, straight at White's king.","The f3-knight flees the g4-pawn; it was lost either way.","The queen swings to the open h-file, threatening …Qh1#.","The only square that guards h1 — but it steps right in front of the g4-pawn.","The pawn snaps the queen off; nothing covers h1 now.","Recapture, but far too late.","Mate. The rook on the open h-file backs the queen, and White's king is smothered by its own pieces."],
    plans:"The trap is hxg4?? hxg4, opening the h-file onto White's king. …Qh4 threatens …Qh1#, and the only guard, Qf3, drops to …gxf3. If White declines the bait correctly, you've still got an aggressive position. A famous blitz haymaker." },
  { name:"Traxler Counterattack", eco:"C57", side:"b", cat:"⚔️ Gambits — as Black",
    line:["e4","e5","Nf3","Nc6","Bc4","Nf6","Ng5","Bc5","Nxf7","Bxf2+","Kxf2","Nxe4+","Kg1","Qh4"],
    idea:"One of the most fearless lines in chess: instead of defending f7 against the Fried Liver, Black ignores it with 4…Bc5!?, aiming his own bishop at f2. If White grabs f7, Black gets a raging attack.",
    notes:["King's pawn.","The Open Game.","Hit e5.","Defend e5.","The Italian bishop, eyeing f7.","The Two Knights.","White lunges at f7 (heading for the Fried Liver).","…Bc5!! The Traxler — ignore the threat and aim your own bishop at f2!","White grabs the fork on the queen and rook…","The point: sacrifice back and rip open the white king.","Forced; the king must take.","Check, grabbing a pawn while the attack rolls on.","The king scurries back.","The queen joins with deadly threats. Down material, but Black's attack is at least as fast — roughly balanced with best play."],
    plans:"Total counter-attack: meet Nxf7 with …Bxf2+! and chase the white king with checks and sacrifices. Theory is razor-sharp and roughly balanced with best play — a thrilling, principled gambit for attackers.",
    vars:[
      { name:"White's best (5.Bxf7+)", line:["e4","e5","Nf3","Nc6","Bc4","Nf6","Ng5","Bc5","Bxf7+","Ke7","Bb3","Rf8"],
        idea:"White's most respected reply: grab the pawn with check and retreat the bishop. Black's king walks to e7 but keeps the extra piece, with active and roughly equal play.",
        notes:["King's pawn.","The Open Game.","Hit e5.","Defend e5.","Eyeing f7.","The Two Knights.","Lunging at f7.","…Bc5!! the Traxler.","The safest grab; considered White's best.","The king steps up to keep the extra piece.","The bishop retreats to safety.","Activate the rook on the half-open f-file, with a comfortable game."],
        plans:"Keep the extra piece, untangle the king (…Kf7, …Re8) and use the open f-file. A calmer, sound way to handle the Traxler." } ] },
  { name:"From's Gambit", eco:"A02", side:"b", cat:"⚔️ Gambits — as Black",
    line:["f4","e5","fxe5","d6","exd6","Bxd6","Nf3","g5","g3","g4","Nh4"],
    idea:"A sharp answer to Bird's Opening (1.f4): Black gambits a pawn with 1…e5 to blow open lines straight at White's slightly weakened kingside. (Beware — White can sidestep into a King's Gambit with 2.e4!)",
    notes:["Bird's Opening, grabbing kingside space.","…e5!? From's Gambit — offer a pawn to rip the position open (2.e4!? would transpose to a King's Gambit).","White accepts.","Chip at the e5-pawn to open lines.","White grabs the pawn.","Recapture; the bishop already eyes h2.","White blunts the …Qh4+ ideas and develops.","The thematic pawn storm: threaten …g4 to chase the knight.","White tries to blunt the attack.","Kick the knight away from f3.","The knight’s shoved to the rim while Black pours down the kingside. A pawn down, but the loose white king is a real target — From’s is a vicious trap for anyone who hasn’t seen it."],
    plans:"Attack the loosened white kingside: …Bd6 eyeing h2, …Nf6/…g5/…Ng4 and queen lifts toward h4. The famous trap is …g5–g4 hitting f3; if White grabs greedily, …Bg3+! can be crushing. One pawn for a roaring initiative." },
  { name:"Blackmar-Diemer Gambit", eco:"D00", side:"w", cat:"⚔️ Gambits — as White",
    line:["d4","d5","e4","dxe4","Nc3","Nf6","f3","exf3","Nxf3","g6","Bc4","Bg7","O-O","O-O"],
    idea:"An aggressive way to attack with 1.d4: White gambits a central pawn for fast development and open lines against the black king. Unsound with precise defence, but a feared club-level attacking weapon.",
    notes:["Queen's pawn.","Black stakes the centre.","e4!? The Blackmar-Diemer: offer the e-pawn to blow the centre open.","Black accepts.","Develop and attack the e4-pawn.","Defend e4 and develop.","The key move: open the f-file and undermine e4.","Black takes the bait.","Recapture. White has a big lead in development and the open f-file for one pawn.","Black prepares to fianchetto and castle.","Develop the bishop, aiming at f7.","Complete the fianchetto.","White castles; the rook eyes the open f-file.","Both castle. For the pawn White has fast development, the f-file and Ne5/Qe1–h4 ideas; objectively about equal."],
    plans:"Rapid development and a kingside storm: Nxf3, Bd3/Bc4, O-O, Qe1–h4, Ne5 and pile onto f7 and h7. Black is theoretically fine with care, so play for the initiative and practical pressure. A pure attacker's gambit." },
  { name:"Wing Gambit (Sicilian)", eco:"B20", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","c5","b4","cxb4","a3","bxa3","Nxa3","d6","d4","Nf6","Bd3"],
    idea:"A swashbuckling anti-Sicilian: 2.b4!? gambits a wing pawn to deflect Black's c-pawn and seize the centre with c3 and d4. Offbeat, but a fun way to dodge mountains of Sicilian theory.",
    notes:["King's pawn.","The Sicilian.","b4!? The Wing Gambit — offer the b-pawn to deflect Black's c-pawn.","Black accepts.","Chip at the b4-pawn to open lines.","Black grabs again.","Recapture, developing toward b5 and c4.","Black sets up a normal Sicilian structure.","The point: a big broad centre for the pawn.","Develop and hit e4.","Develop and guard e4. For a pawn White has a strong centre, open a- and b-files and easy development; roughly equal."],
    plans:"Take the centre: after …bxa3 (or …d5) play c3 and d4, develop quickly (Nf3, Bd3/Bc4, O-O) and use the open a- and b-files. A pawn for central space and easy, theory-light play." },
  { name:"Cochrane Gambit", eco:"C42", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Nf3","Nf6","Nxe5","d6","Nxf7","Kxf7","d4","c5","Bc4+","Be6","Bxe6+","Kxe6"],
    idea:"A jaw-dropping anti-Petrov: White sacrifices a whole knight with 4.Nxf7!? to drag the black king into the open. Wild, unbalancing, and surprisingly venomous in practice.",
    notes:["King's pawn.","The Open Game.","Attack e5.","The Petrov: hit e4 in return.","Grab the pawn.","Kick the knight (the normal Petrov move)…","Nxf7!? The Cochrane Gambit — a knight for two pawns and the black king!","The king must take.","Rip the centre open and bring the pieces to life.","Black hits back at the centre.","Check the exposed king.","Block the check.","Trade and drag the king out.","The king is stranded on e6. White is down a knight for two pawns, but the open lines and exposed king give full practical compensation; the engine calls it level."],
    plans:"You gave a knight for two pawns and an exposed king — so attack: d4 for a big centre, Bc4+/Bd3, Nc3, O-O and throw everything at the stranded king on f7. Trade material for a lasting initiative." },

  { name:"French: Tarrasch (3.Nd2)", eco:"C03", side:"b", cat:"Defenses to 1. e4",
    line:["e4","e6","d4","d5","Nd2","Nf6","e5","Nfd7","Bd3","c5","c3","Nc6"],
    idea:"White meets the French with the flexible 3.Nd2, dodging the Winawer pin and keeping a healthy structure. Black hits back at the centre with …c5.",
    notes:["King's pawn.","The French: Black will challenge the centre with …d5.","Build the big centre.","Strike at e4.","The Tarrasch — develop without blocking the c-pawn or allowing …Bb4.","Develop and hit e4.","Gain space and kick the knight.","Retreat; the knight will support …c5 and …f6 breaks.","Aim the bishop at the kingside.","The thematic French break against d4.","Prop up d4.","Pile on d4. White has space; Black pressures the base of the chain."],
    plans:"White keeps the space edge: Ngf3, castle, and look for kingside chances behind the e5 pawn. Black plays on the queenside and against d4 with …Qb6, …cxd4 and …f6. Understand the pawn chain and you understand the French." },
  { name:"Queen's Indian Defense", eco:"E15", side:"b", cat:"Defenses to 1. d4",
    line:["d4","Nf6","c4","e6","Nf3","b6","g3","Bb7","Bg2","Be7","O-O","O-O"],
    idea:"When White plays 3.Nf3 to avoid the Nimzo, Black fianchettoes the light bishop to fight for e4 and the long diagonal. Solid, flexible, hard to crack.",
    notes:["Queen's pawn.","Control e4 and stay flexible.","Grab queenside space — the Queen's Gambit family.","Open lines for the bishop and prepare …d5 or …Bb4.","White avoids the Nimzo pin.","The Queen's Indian — prepare to fianchetto and fight for e4.","White fianchettoes to contest the long diagonal too.","The bishop eyes e4 and h1.","Bishops stare down the long diagonal.","Quietly develop, ready to castle.","Safety first.","Black is solid and harmonious. A long fight over e4 and the centre."],
    plans:"Black contests e4 with …Bb7, …Ne4 and sometimes …d5 or …c5. White expands with Nc3, Qc2 and a central break. A patient battle of small advantages — bishops and the centre, not early tactics." },
  { name:"Bogo-Indian Defense", eco:"E11", side:"b", cat:"Defenses to 1. d4",
    line:["d4","Nf6","c4","e6","Nf3","Bb4+","Bd2","Qe7","g3","O-O","Bg2","d5"],
    idea:"A simple, sound cousin of the Nimzo: with 3.Nf3 stopping the Nimzo, Black checks on b4 anyway and gets an easy game. Very low theory.",
    notes:["Queen's pawn.","Flexible control of e4.","Queenside space.","Open lines, prepare …Bb4.","White sidesteps the Nimzo.","The Bogo-Indian — check and pin-style pressure regardless.","Block the check.","Keep the bishop-pair option and prepare to castle.","White fianchettoes.","Castle into safety.","Bishop on the long diagonal.","Stake a claim in the centre. Easy, equal development."],
    plans:"Black aims for a comfortable centre with …d5 or …d6 and …e5, often trading the dark bishop for the d2-knight. White uses the bishop pair and space. A clean, low-maintenance answer to 1.d4." },
  { name:"Colle System", eco:"D05", side:"w", cat:"1. d4 — Queen's Pawn",
    line:["d4","d5","Nf3","Nf6","e3","e6","Bd3","c5","c3","Nc6","Nbd2","Bd6"],
    idea:"A system you can play on autopilot, like the London but with the bishop inside the chain. Set up d4-e3-Bd3-c3-Nbd2, then strike with e4.",
    notes:["Queen's pawn.","Black stakes the centre.","Develop and control e5.","Mirror.","The Colle — solid, but it shuts in the c1-bishop for now.","Black builds symmetrically.","Aim the bishop at h7.","Black challenges d4.","Support d4 and complete the triangle.","Develop and pressure d4.","Prepare the e4 break.","Both sides developed. White's whole plan is the e4 push."],
    plans:"Castle, then play the freeing break e4. After e4 the Bd3 and knights point at Black's king for a kingside attack — the classic Colle. Easy to learn, dangerous if Black is careless." },
  { name:"Stonewall Attack", eco:"D00", side:"w", cat:"1. d4 — Queen's Pawn",
    line:["d4","d5","e3","Nf6","Bd3","e6","f4","c5","c3","Nc6","Nf3","Bd6"],
    idea:"White builds an immovable wall on d4-e3-f4 and aims everything at the kingside. A blunt attacking system that needs almost no theory.",
    notes:["Queen's pawn.","Black takes the centre.","Begin the wall.","Develop.","The attacking bishop, aimed at h7.","Black mirrors.","The Stonewall — a fixed wall and a kingside spearhead.","Black strikes at the base, d4.","Cement d4.","Pressure d4.","Develop; eye e5 and g5.","Developed. White will castle and storm the kingside."],
    plans:"Castle kingside, plant a knight on e5, swing the queen to h5 and a rook to f3-h3, and attack h7/g7. The catch is a weak e4 square and the bad c1-bishop, so commit to the attack. Crude but effective." },
  { name:"Torre Attack", eco:"A46", side:"w", cat:"1. d4 — Queen's Pawn",
    line:["d4","Nf6","Nf3","e6","Bg5","h6","Bh4","b6","e3","Bb7","Bd3","Be7"],
    idea:"Another low-theory system: Nf3 and Bg5 pin the f6-knight, then build with e3, Bd3, Nbd2 and c3. Flexible and easy to handle.",
    notes:["Queen's pawn.","Control e4.","Develop.","Black opens lines for the bishop.","The Torre — pin the knight and pressure the kingside.","Question the bishop.","Keep the pin.","Black fianchettoes to fight for e4.","Solid; open the bishop.","Eye the long diagonal.","Develop and aim at h7.","Both sides developed. A calm manoeuvring system."],
    plans:"Castle, play c3 and Nbd2, and pick a plan: e4 for the centre, or Ne5 and a kingside build-up. Trade the dark bishop for the knight if useful. Reliable and repeatable against almost anything." },
  { name:"Benoni Defense", eco:"A61", side:"b", cat:"Defenses to 1. d4",
    line:["d4","Nf6","c4","c5","d5","e6","Nc3","exd5","cxd5","d6","e4","g6"],
    idea:"The Modern Benoni: Black hands White a big centre and space in return for a queenside pawn majority and a strong fianchettoed bishop. Sharp and double-edged.",
    notes:["Queen's pawn.","Control e4.","Queenside space.","The Benoni — challenge d4 at once.","White advances and gains space.","Chip at the d5 pawn.","Develop and guard e4/d5.","Open the e-file and clarify.","Recapture; White gets a big d5/e4 centre.","Lock the structure — the classic Benoni chain.","White builds the broad centre.","Black fianchettoes; …b5 and the g7-bishop are the counterplay."],
    plans:"Black plays …Bg7, …O-O, …Re8 and the freeing …b5 break with queenside expansion. White uses the space and central majority, often f4 and e5. Opposite-wing attacks — a real fighter's choice." },
  { name:"Tarrasch Defense", eco:"D32", side:"b", cat:"Defenses to 1. d4",
    line:["d4","d5","c4","e6","Nc3","c5","cxd5","exd5","Nf3","Nc6","g3","Nf6"],
    idea:"Against the Queen's Gambit, Black grabs the centre with …c5 and accepts an isolated d-pawn in return for free, active piece play. Principled and aggressive.",
    notes:["Queen's pawn.","Black takes the centre.","The Queen's Gambit.","Support d5, open the bishop.","Develop and pressure d5.","The Tarrasch — counter-attack instead of defending passively.","Open lines.","Recapture; Black accepts an isolated d-pawn.","Develop and blockade.","Active development.","White fianchettoes to pressure d5.","Develop. Black has free pieces and open files for the isolated pawn."],
    plans:"Black uses active pieces and the open c- and e-files: …Be7, …O-O, …Re8, sometimes …d4 to break free. White blockades d5/d4 with Nf3, Bg2 and Nf4, aiming to win the isolated pawn long-term. Activity now versus structure later." },
  { name:"Sicilian: Alapin (2.c3)", eco:"B22", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","c5","c3","Nf6","e5","Nd5","d4","cxd4","Nf3","Nc6","cxd4","d6"],
    idea:"The simplest way to face the Sicilian: 2.c3 prepares d4 and a big centre, sidestepping nearly all of Black's sharp main-line theory.",
    notes:["King's pawn.","The Sicilian.","The Alapin — prepare d4 with no theory to memorize.","Hit e4 at once (the critical try).","Push and gain a tempo.","The knight hops to d5.","Build the centre you wanted.","Black strikes.","Develop and prepare to recapture.","Develop and pressure d4.","A strong d4/e5 centre.","Black chips at e5. White has a pleasant space edge."],
    plans:"Develop naturally — Bc4 or Be2, O-O, Nc3 — keep the d4/e5 centre and play in the centre and kingside. No memorization, just sound chess: a great practical weapon against the Sicilian." },
  { name:"Sicilian: Closed", eco:"B25", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","c5","Nc3","Nc6","g3","g6","Bg2","Bg7","d3","d6","f4","e6"],
    idea:"Skip the open Sicilian entirely: Nc3, g3, Bg2 and d3, then attack on the kingside with f4-f5. Calm setup, sharp attack.",
    notes:["King's pawn.","The Sicilian.","The Closed Sicilian — no early d4.","Develop.","Prepare the fianchetto.","Black mirrors.","Bishop on the long diagonal.","Mirror.","Solid, restrained centre.","Black builds the same setup.","The point — gain kingside space and prepare f5.","Black prepares …d5 and queenside play. Opposite-wing plans."],
    plans:"White attacks the kingside: Nf3, O-O, then f5, with pieces swinging over (Qe1-h4, Be3, Rf2). Black expands on the queenside with …Rb8, …b5-b4. A clear, plan-based race that avoids Sicilian theory." },
  { name:"Ponziani Opening", eco:"C44", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","e5","Nf3","Nc6","c3","Nf6","d4","exd4","e5","Nd5"],
    idea:"A very old 1.e4 e5 try: 3.c3 prepares d4 to grab the centre immediately. Offbeat and rarely studied, so it can catch opponents off guard.",
    notes:["King's pawn.","The Open Game.","Develop and hit e5.","Defend e5.","The Ponziani — prepare an immediate d4.","Black develops and hits e4 (a solid reply).","Strike in the centre.","Black takes.","Push with tempo, kicking the knight.","The knight reroutes. White has space and a central lead with little theory."],
    plans:"Recapture on d4 (cxd4) for a strong centre, develop Bc4/Bd3 and Nc3, castle, and use the space. The Ponziani is rare, so a little home prep gives a real practical edge in faster games." },
  { name:"Center Game", eco:"C22", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","e5","d4","exd4","Qxd4","Nc6","Qe3","Nf6","Nc3","Bb4","Bd2","O-O"],
    idea:"White opens the centre at once with 2.d4 and recaptures with the queen. The modern Qe3 lines give a quick, aggressive setup with queenside castling.",
    notes:["King's pawn.","The Open Game.","The Center Game — open the centre at once.","Black takes.","Recapture with the queen (the only good way).","Develop with tempo, hitting the queen.","The modern square — the queen guards e4 and eyes O-O-O.","Develop and hit e4.","Defend e4 and develop.","Pin the knight.","Break the pin and prepare long castling.","Opposite-side castling looms. Sharp and aggressive."],
    plans:"White castles queenside and storms the kingside with f3, g4, h4 and Bh6. Black castles kingside and counters in the centre and queenside (…d5, …Re8). An aggressive opposite-wings fight." },
];
// ═══════════════════════════════════════════════════════════════
//  PGN IMPORT + GAME ANALYSIS
// ═══════════════════════════════════════════════════════════════
function cleanSAN(s){return s.replace(/[+#!?]/g,'').replace(/0-0-0/gi,'O-O-O').replace(/0-0/gi,'O-O').replace(/e\.p\.?/gi,'').trim();}

function parsePGN(pgn){
  let t=pgn.replace(/\[[^\]]*\]/g,' ');       // tag headers
  t=t.replace(/\{[^}]*\}/g,' ');              // {comments}
  t=t.replace(/\([^()]*\)/g,' ');             // (variations) – simple
  t=t.replace(/\$\d+/g,' ');                  // $NAGs
  t=t.replace(/\d+\.(\.\.)?/g,' ');           // move numbers 12. / 12...
  t=t.replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g,' '); // results
  return t.trim().split(/\s+/).filter(x=>x.length>0&&/[a-hKQRBNO]/.test(x));
}

// Also pull the player names / result for display
function parsePGNHeaders(pgn){
  const h={};
  const re=/\[(\w+)\s+"([^"]*)"\]/g;let m;
  while((m=re.exec(pgn)))h[m[1]]=m[2];
  return h;
}

// Build positions + plies from SAN list
function loadSANs(sans){
  let game=initGame();
  const positions=[game];const plies=[];
  for(let i=0;i<sans.length;i++){
    const want=cleanSAN(sans[i]);let found=null;
    for(const mv of getLegal(game)){const nb=applyMove(game.board,mv);if(cleanSAN(toSAN(game,mv,nb))===want){found=mv;break;}}
    if(!found)return{ok:false,positions,plies,error:`Move ${i+1} ("${sans[i]}") didn't fit the position.`,parsed:i};
    game=makeMove(game,found);positions.push(game);plies.push({san:sans[i],move:found});
  }
  return{ok:true,positions,plies};
}

// Rank legal moves by eval (white POV centipawns), best first for side to move
function rankMoves(game,depth){
  const moves=getLegal(game);const maxing=game.turn==='w';
  const scored=moves.map(m=>({m,v:minimax(makeFast(game,m),depth-1,-Infinity,Infinity,!maxing)}));
  scored.sort((a,b)=>maxing?b.v-a.v:a.v-b.v);
  return scored;
}

function classify(loss){
  if(loss<15) return{label:'Best',     c:'#6fd66f',i:'★'};
  if(loss<40) return{label:'Excellent', c:'#9fcf6f',i:'✓'};
  if(loss<90) return{label:'Good',      c:'#c9d06a',i:'·'};
  if(loss<160)return{label:'Inaccuracy',c:'#f0cf5e',i:'?!'};
  if(loss<320)return{label:'Mistake',   c:'#f0a24e',i:'?'};
  return            {label:'Blunder',   c:'#ec5c4e',i:'??'};
}
let SFX_ON=true; let _ctxSfx=null;
function _sfxCtx(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;if(!_ctxSfx)_ctxSfx=new A();if(_ctxSfx.state==='suspended')_ctxSfx.resume();return _ctxSfx;}catch(e){return null;}}
function _sfxTone(ctx,type,f,t0,dur,vol,f2){try{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);if(f2!=null)o.frequency.exponentialRampToValueAtTime(Math.max(1,f2),t0+dur);g.gain.setValueAtTime(0.0001,t0);g.gain.linearRampToValueAtTime(vol,t0+0.008);g.gain.exponentialRampToValueAtTime(0.0006,t0+dur);o.connect(g);g.connect(ctx.destination);o.start(t0);o.stop(t0+dur+0.03);}catch(e){}}
function _sfxNoise(ctx,t0,dur,vol,cut){try{const n=Math.max(1,Math.floor(ctx.sampleRate*dur));const buf=ctx.createBuffer(1,n,ctx.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.2);const sc=ctx.createBufferSource();sc.buffer=buf;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=cut||1400;const g=ctx.createGain();g.gain.value=vol;sc.connect(lp);lp.connect(g);g.connect(ctx.destination);sc.start(t0);sc.stop(t0+dur+0.03);}catch(e){}}
function playSfx(kind){
  if(!SFX_ON)return;const ctx=_sfxCtx();if(!ctx)return;const t=ctx.currentTime;
  try{
    if(kind==='move'){_sfxTone(ctx,'triangle',300,t,0.055,0.13,210);_sfxNoise(ctx,t,0.028,0.045,1200);}
    else if(kind==='capture'){_sfxNoise(ctx,t,0.085,0.13,950);_sfxTone(ctx,'sine',150,t,0.10,0.12,85);}
    else if(kind==='castle'){_sfxTone(ctx,'triangle',250,t,0.05,0.11,200);_sfxTone(ctx,'triangle',250,t+0.08,0.05,0.11,200);}
    else if(kind==='check'){_sfxTone(ctx,'square',1080,t,0.06,0.085,1080);_sfxTone(ctx,'square',1480,t+0.085,0.085,0.085,1480);}
    else if(kind==='promote'){[523,659,784,1047].forEach(function(f,i){_sfxTone(ctx,'triangle',f,t+i*0.065,0.11,0.10);});}
    else if(kind==='end'){[392,330,262].forEach(function(f,i){_sfxTone(ctx,'sine',f,t+i*0.13,0.22,0.11);});}
  }catch(e){}
}
let _ctxBril=null;
function playBrilliantChime(){
  if(!SFX_ON)return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
    if(!_ctxBril)_ctxBril=new AC();
    const ctx=_ctxBril; if(ctx.state==='suspended')ctx.resume();
    const t0=ctx.currentTime;
    [[784,0],[988,0.08],[1319,0.16],[1568,0.24]].forEach(function(p){var f=p[0],dt=p[1];
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type='triangle'; o.frequency.value=f;
      g.gain.setValueAtTime(0.0001,t0+dt);
      g.gain.linearRampToValueAtTime(0.12,t0+dt+0.01);
      g.gain.exponentialRampToValueAtTime(0.0006,t0+dt+0.32);
      o.connect(g); g.connect(ctx.destination); o.start(t0+dt); o.stop(t0+dt+0.34);
    });
  }catch(e){}
}

// Heuristic "Brilliant" (!!): an essentially-best move that gives up real material (after the exchanges
// fully settle) yet keeps the mover clearly better, from a genuinely contested (not already-winning) position.
// Deliberately strict — better to miss one than to over-award. NOTE: this is OUR heuristic, not a Stockfish output.
function isBrilliant(pos,pl,loss,evalAfterWhite,evalBeforeWhite){
  if(loss>=15)return false;                       // must be (essentially) the best move
  const mc=pos.turn,sgn=mc==='w'?1:-1;
  const matBefore=sgn*materialDiff(pos.board);
  let g2;try{g2=makeMove(pos,pl);}catch(e){return false;}
  if(!g2)return false;
  // Settle the position: opponent's best reply, THEN the mover's best recapture, so a piece you win
  // straight back is not counted as a sacrifice (this was the bug behind false "brilliant" tags).
  let settled=g2.board,g3=g2;
  try{const rep=rankMoves(g2,1);if(rep&&rep[0]&&rep[0].m){const gg=makeMove(g2,rep[0].m);if(gg){g3=gg;settled=gg.board;}}}catch(e){}
  try{const rep2=rankMoves(g3,1);if(rep2&&rep2[0]&&rep2[0].m)settled=applyMove(g3.board,rep2[0].m);}catch(e){}
  const sac=matBefore-sgn*materialDiff(settled);
  const evAfter=sgn*evalAfterWhite,evBefore=sgn*(evalBeforeWhite!=null?evalBeforeWhite:evalPawns(pos));
  return sac>=2 && evAfter>=0.8 && evBefore>-1.0 && evBefore<3.0;
}

// Background tally of a game's move quality for the USER (or all moves if color unknown). Yields periodically so it can run without freezing the UI.
async function analyzeGameCounts(pgn,userColor){
  try{
    const sans=parsePGN(pgn);if(!sans||!sans.length)return null;
    const res=loadSANs(sans);if(!res||!res.plies.length)return null;
    let bril=0,great=0,inacc=0,mist=0,blun=0,proc=0;
    for(let i=0;i<res.plies.length;i++){
      const mc=i%2===0?'w':'b';if(userColor&&mc!==userColor)continue;
      const pos=res.positions[i],scored=rankMoves(pos,2);if(!scored||!scored.length)continue;
      const bestVal=scored[0].v,pl=res.plies[i].move;
      const actual=scored.find(s=>s.m.fr===pl.fr&&s.m.fc===pl.fc&&s.m.tr===pl.tr&&s.m.tc===pl.tc);
      const actualVal=actual?actual.v:(pos.turn==='w'?-9999:9999);
      const loss=Math.max(0,mc==='w'?bestVal-actualVal:actualVal-bestVal);
      const L=isBrilliant(pos,pl,Math.round(loss),evalPawns(res.positions[i+1]))?'Brilliant':classify(loss).label;
      if(L==='Brilliant')bril++;else if(L==='Best'||L==='Great')great++;else if(L==='Inaccuracy')inacc++;else if(L==='Mistake'||L==='Miss')mist++;else if(L==='Blunder')blun++;
      if((++proc)%2===0)await new Promise(r=>setTimeout(r,0));
    }
    return {bril,great,inacc,mist,blun};
  }catch(e){return null;}
}

// Identify the opening played: the known line sharing the longest move-for-move prefix with the game
function nameOpening(playedSans){
  const played=playedSans.map(cleanSAN);
  let best=null,bestK=0;
  const consider=(name,eco,line)=>{
    if(!line||line.length===0)return;
    let k=0;const n=Math.min(line.length,played.length);
    while(k<n&&played[k]===cleanSAN(line[k]))k++;
    if(k>bestK){bestK=k;best={name,eco};}
  };
  for(const op of OPENINGS){consider(op.name,op.eco,op.line);if(op.vars)for(const v of op.vars)consider(op.name+' — '+v.name,op.eco,v.line);}
  return bestK>=4?best:null;
}
// How many leading plies of the game followed known opening theory (longest matching library line prefix).
function openingBookPlies(playedSans){
  const played=playedSans.map(cleanSAN);
  let best=0;
  const consider=(line)=>{if(!line||!line.length)return;let k=0;const n=Math.min(line.length,played.length);while(k<n&&played[k]===cleanSAN(line[k]))k++;if(k>best)best=k;};
  for(const op of OPENINGS){consider(op.line);if(op.vars)for(const v of op.vars)consider(v.line);}
  return Math.min(best,24);
}
// Pull a capped list of SAN tokens out of a PGN movetext (enough for opening identification).
function pgnSans(pgn,max){
  if(!pgn)return [];
  let t=String(pgn).replace(/\{[^}]*\}/g,' ').replace(/\([^)]*\)/g,' ').replace(/\[[^\]]*\]/g,' ').replace(/\$\d+/g,' ');
  t=t.replace(/\b\d+\.(\.\.)?/g,' ').replace(/(1-0|0-1|1\/2-1\/2|\*)/g,' ');
  const out=[];
  for(const tok of t.split(/\s+/)){if(!tok)continue;if(/^O-O(-O)?[+#]?$/.test(tok)||/^[KQRBNa-h][a-h0-8xKQRBN=+#!?-]*$/.test(tok)){out.push(tok);if(max&&out.length>=max)break;}}
  return out;
}
// Tactics puzzles. Each: fen, goal, motif, level, sol[] (solver's moves), reply[] (opponent's forced replies, played after each sol move), hint, explain.
const PUZZLES=[
  { fen:"6k1/5ppp/8/8/8/8/8/3Q2K1 w - - 0 1", goal:"White to play — mate in 1", motif:"Back-rank mate", level:"Easy",
    sol:["Qd8#"], reply:[],
    hint:"The back rank is wide open, and Black's king is boxed in by its own pawns. Bring the heavy piece to the 8th rank.",
    explain:"Qd8# — the classic back-rank mate. The f7/g7/h7 pawns that shelter the king also trap it: there's no escape and nothing to block the check." },
  { fen:"6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1", goal:"White to play — mate in 1", motif:"Back-rank mate", level:"Easy",
    sol:["Re8#"], reply:[],
    hint:"A rook is just as deadly on an open back rank. Where can it deliver check with no escape?",
    explain:"Re8# — same back-rank idea with the rook. Always check whether your opponent has made 'luft' (a pawn move for the king); here Black hasn't, and it's fatal." },
  { fen:"7k/R7/1R6/8/8/8/8/6K1 w - - 0 1", goal:"White to play — mate in 1", motif:"Two-rook ladder", level:"Easy",
    sol:["Rb8#"], reply:[],
    hint:"Two rooks mate a lone king with a 'ladder'. One rook already cuts off the 7th rank — use the other.",
    explain:"Rb8# — the two-rook ladder. The a7-rook fences off the 7th rank, so when the second rook checks on the 8th, the king has nowhere to go." },
  { fen:"7k/8/5K2/8/8/8/6Q1/8 w - - 0 1", goal:"White to play — mate in 1", motif:"King & queen mate", level:"Easy",
    sol:["Qg7#"], reply:[],
    hint:"Your king on f6 is the key: it guards g7. Put the queen right next to the enemy king.",
    explain:"Qg7# — the basic king-and-queen mate. The queen delivers check from g7 and the king on f6 defends her, so she can't be captured and the king is trapped on the edge." },
  { fen:"5rk1/5ppp/8/7Q/8/3B4/8/6K1 w - - 0 1", goal:"White to play — mate in 1", motif:"Queen + bishop mate", level:"Medium",
    sol:["Qxh7#"], reply:[],
    hint:"The bishop on d3 is aiming straight at h7. What if the queen joined it there?",
    explain:"Qxh7# — queen and bishop, the deadliest attacking duo. The bishop guards h7, so the queen is immune, and the king is smothered by its own pieces. This is the engine behind the famous 'Greek gift' sacrifice." },
  { fen:"q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", goal:"White to play — win the queen", motif:"Knight fork", level:"Medium",
    sol:["Nc7+"], reply:[],
    hint:"Look for a knight move that attacks the king and something valuable at the same time.",
    explain:"Nc7+ — a royal fork. The knight checks the king and attacks the queen on a8 at once; the king must move, and then Nxa8 scoops the queen. Knights are the masters of the fork." },
  { fen:"8/8/8/r3k3/8/8/8/4K2R w - - 0 1", goal:"White to play — win a rook", motif:"Skewer", level:"Medium",
    sol:["Rh5+","Rxa5"], reply:["Kd4"],
    hint:"Line your rook up against the king with another piece stuck behind it on the same line. Check first — the king has to step aside.",
    explain:"Rh5+! is a skewer. The king is checked along the 5th rank and must move off it, but it can't shield the rook sitting behind it on a5. Once the king steps away, Rxa5 wins the rook clean." },
  { fen:"5r1k/6pp/7N/3Q4/8/8/8/6K1 w - - 0 1", goal:"White to play — mate in 2", motif:"Smothered mate", level:"Hard",
    sol:["Qg8+","Nf7#"], reply:["Rxg8"],
    hint:"Sacrifice the queen to force the rook onto g8 — then a knight delivers the famous smothered mate.",
    explain:"Qg8+!! is a stunning sacrifice. The knight on h6 guards g8, so the king can't take — the rook must (…Rxg8). Now Nf7# is smothered mate: the king is buried by its own rook and pawns. One of chess's most beautiful patterns." },

  // ─────────── Famous opening traps (≤10 moves) ───────────
  { fen:"r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1", goal:"White to play — mate in 1", motif:"Opening trap: Scholar's Mate", level:"Easy",
    sol:["Qxf7#"], reply:[],
    hint:"The c4-bishop already guards f7 — the one square only the king defends. Bring the queen to it.",
    explain:"Qxf7# — Scholar's Mate, the most famous beginner trap. The queen lands on f7 protected by the c4-bishop, and the king has no escape. Black went wrong with …Nf6; the fixes are …g6 or …Qe7. Know it from both sides!" },
  { fen:"r1b1k2r/ppppqppp/2n5/4P3/1bP2Bn1/P4N2/1P1NPPPP/R2QKB1R b KQkq - 0 1", goal:"Black to play — White just grabbed your bishop. Punish it!", motif:"Opening trap: Kieninger Trap (Budapest)", level:"Medium",
    sol:["Ngxe5","Nd3#"], reply:["axb4"],
    hint:"Don't rescue your attacked bishop on b4 — ignore it. Take the e5-pawn with your g4-knight, and a smothered mate appears.",
    explain:"Ngxe5! ignores the bishop and threatens …Nd3#. After the greedy axb4??, Nd3# is a smothered mate — the d3-knight boxes the king in with no escape and no way to capture it. The Kieninger Trap from the Budapest Gambit." },
  { fen:"r1bqkbnr/pppp1ppp/8/4N3/2BnP3/8/PPPP1PPP/RNBQK2R b KQkq - 0 1", goal:"Black to play — White grabbed the e5-pawn. Make them pay.", motif:"Opening trap: Blackburne Shilling", level:"Hard",
    sol:["Qg5","Qxg2","Qxe4+","Nf3#"], reply:["Nxf7","Rf1","Be2"],
    hint:"Hit two things at once with your queen, then ignore White's counterplay and storm in. It ends in a smothered mate on f3.",
    explain:"Qg5! double-attacks the e5-knight and the g2-pawn. After Nxf7 Qxg2 Rf1 Qxe4+ Be2, the little d4-knight lands Nf3# — a smothered mate. The Blackburne Shilling Gambit trap." },
  { fen:"r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1", goal:"White to play — Black's …Bg4 pins your knight. Spring the Légal's Mate trap! (It only works if Black grabs the queen — but here, Black will.)", motif:"Opening trap: Légal's Mate", level:"Hard",
    sol:["Nxe5","Bxf7+","Nd5#"], reply:["Bxd1","Ke7"],
    hint:"The pin on your f3-knight is an illusion — ignore your queen entirely. Strike in the centre, then hunt the king with bishop and knight.",
    explain:"Nxe5!! ignores the pin. If Black grabs the queen with …Bxd1??, then Bxf7+ Ke7 Nd5# — Légal's Mate: three minor pieces deliver mate while the queen sits useless on d1. (If Black instead plays …dxe5, then Bxf7+ and Qxg4 simply win a pawn.)" },
  { fen:"r1bqk2r/ppp2ppp/2p2n2/2b3B1/4P3/3P4/PPP2PPP/RN1QKB1R b KQkq - 0 1", goal:"Black to play — White pinned your knight with Bg5. Strike!", motif:"Opening trap: Stafford Gambit", level:"Hard",
    sol:["Nxe4","Bxf2+","Bg4#"], reply:["Bxd8","Ke2"],
    hint:"Your knight looks pinned to your queen — move it anyway! Crash into e4 and aim everything at f2.",
    explain:"Nxe4!! ignores the 'pin'. After Bxd8 (grabbing the queen), Bxf2+ Ke2 Bg4# is a picture mate — a whole queen down! The light bishop pins on the diagonal while the knight covers the king's escape. The famous Stafford Gambit trap." },
  { fen:"rnbqk1nr/ppp2ppp/8/4P3/1BP5/8/PP2KpPP/RN1Q1BNR b kq - 0 1", goal:"Black to play — find the brilliant promotion.", motif:"Opening trap: Lasker Trap (underpromotion!)", level:"Hard",
    sol:["fxg1=N+","Bg4+","Bxd1"], reply:["Rxg1","Kf2"],
    hint:"Your f2-pawn can promote with check — but a new queen would just be captured. Promote to the piece that checks AND can't be ignored.",
    explain:"fxg1=N+!! — the famous underpromotion. A new queen would allow Qxd1, but the knight gives check, forcing Rxg1. Then Bg4+ and Bxd1 win White's queen outright. The Lasker Trap from the Albin Counter-Gambit — promoting to a knight, not a queen!" },
];
// ─────────────────────────────────────────────────────────────
//  PUZZLE POOL + ROADMAP  (auto-generated; do not hand-edit)
//  876 real-game puzzles from the Lichess open database (CC0),
//  each verified solvable + unique through the app's own move engine.
//  Motifs: mates, forks, pins, skewers, discovered attacks, sacrifices, …
// ─────────────────────────────────────────────────────────────
const PZGEN_RAW=[{"f":"7k/pb3rpp/2p5/5p2/3P4/8/PPP2PPP/4R1K1 w - - 0 1","s":["Re8+","Rxf8+"],"y":["Rf8"],"r":600,"m":"Back-rank mate","n":2},{"f":"2r5/1p2k1pp/4p3/1N3p2/5P2/P2nP3/3R2PP/6K1 b - - 0 1","s":["Rc1+","Rxd1+"],"y":["Rd1"],"r":600,"m":"Mate in 2","n":2},{"f":"8/pp3Q1p/1n2B1pk/8/5PPq/7P/PPP5/2K5 b - f3 0 1","s":["Qe1+"],"y":[],"r":600,"m":"Mate in 1","n":1},{"f":"6k1/5ppp/8/1r2rP2/6P1/2RK3P/8/7B w - - 0 1","s":["Rc8+","Rxe8+"],"y":["Re8"],"r":600,"m":"Back-rank mate","n":2},{"f":"1k2r3/p2Q1R2/8/1p5p/P1P3p1/8/6PP/7K b - - 0 1","s":["Re1+","Rxf1+"],"y":["Rf1"],"r":600,"m":"Back-rank mate","n":2},{"f":"1rb4k/p5pp/1p6/3R4/2B1p3/8/PP3rPP/1K5R w - - 0 1","s":["Rd8+","Rxf8+"],"y":["Rf8"],"r":600,"m":"Back-rank mate","n":2},{"f":"2r3k1/pb3ppp/1p2pq2/1P6/2Q1PP2/6P1/P5BP/2R3K1 w - - 0 1","s":["Qxc8+","Rxc8+","Rxd8+"],"y":["Bxc8","Qd8"],"r":600,"m":"Back-rank mate","n":3},{"f":"3r3r/4bk2/1R2p3/3pP2p/P2n4/2Q2p1P/6P1/R5K1 b - - 0 1","s":["Ne2+","Nxc3"],"y":["Kh2"],"r":600,"m":"Fork","n":0},{"f":"3r2k1/1B3n1p/6p1/2P2p2/1P6/2Q1P3/2P2PPP/6K1 b - - 0 1","s":["Rd1+","Rxe1+"],"y":["Qe1"],"r":600,"m":"Back-rank mate","n":2},{"f":"3r2k1/p4pp1/1p3b1p/3Q1B2/5p2/2q4P/P4PP1/3R2K1 w - - 0 1","s":["Qxd8+","Rxd8+"],"y":["Bxd8"],"r":600,"m":"Mate in 2","n":2},{"f":"r5k1/pp3pp1/7p/3P2qn/8/1P1BRP1P/4RP1K/8 w - - 0 1","s":["Re8+","Rxe8+"],"y":["Rxe8"],"r":600,"m":"Mate in 2","n":2},{"f":"6k1/1R3p1p/2r1p1p1/3p1b2/2pB4/4P2P/5PP1/6K1 w - - 0 1","s":["Rb8+","Rxc8+"],"y":["Rc8"],"r":600,"m":"Mate in 2","n":2},{"f":"4r1k1/4P1pb/4r2p/p1p1p3/P2p2PP/1P3R2/2P2R2/6K1 w - - 0 1","s":["Rf8+","exf8=Q+"],"y":["Rxf8"],"r":600,"m":"Mate in 2","n":2},{"f":"4r1k1/1p1q1pp1/p6p/2PP4/4Q3/8/5PPP/4R1K1 w - - 0 1","s":["Qxe8+","Rxe8+"],"y":["Qxe8"],"r":600,"m":"Winning tactic","n":0},{"f":"4q1k1/pp3pp1/2nN1n1p/8/3p4/1P1P1BPb/PBQ2P1P/6K1 b - - 0 1","s":["Qe1+"],"y":[],"r":600,"m":"Mate in 1","n":1},{"f":"2k2r2/pppn2p1/3b4/8/3P2q1/2P2n2/PP2R3/RN1KQ3 w - - 0 1","s":["Re8+","Qxe8+"],"y":["Rxe8"],"r":600,"m":"Mate in 2","n":2},{"f":"5rk1/4bppp/3p4/2p5/4q3/1Q1R4/1PP2PPP/2B3K1 b - - 0 1","s":["Qe1+"],"y":[],"r":600,"m":"Mate in 1","n":1},{"f":"r4rk1/pp3qpp/2p1p3/2PpP3/3P3n/2P1Q1R1/P3N1PP/5RK1 b - - 0 1","s":["Qxf1+"],"y":[],"r":600,"m":"Mate in 1","n":1},{"f":"r5k1/2p3p1/3p2pp/1P2p3/8/4B2P/5PP1/2K2R2 b - - 0 1","s":["Ra1+","Rxf1"],"y":["Kd2"],"r":600,"m":"Skewer","n":0},{"f":"2r2k2/p2r1pp1/1p6/4PpP1/3p3R/7R/PP5P/6K1 w - - 0 1","s":["Rh8+","Rxc8"],"y":["Ke7"],"r":600,"m":"Skewer","n":0},{"f":"4k2r/4nppp/pQ2p3/1p6/4b3/5N2/qP3PPP/2B3K1 w k - 0 1","s":["Qb8+","Qxc8+"],"y":["Nc8"],"r":600,"m":"Winning tactic","n":0},{"f":"rnb1k2r/p2pppbp/6p1/1q2P3/3P4/2Q2N2/PP3PPP/R1B1K2R w KQkq - 0 1","s":["Qxc8+"],"y":[],"r":600,"m":"Mate in 1","n":1},{"f":"3r2k1/5pp1/2r1b2p/1p6/8/2p3BP/1P3PP1/1B1R2K1 w - - 0 1","s":["Rxd8+"],"y":[],"r":600,"m":"Mate in 1","n":1},{"f":"2rr2k1/p4pp1/1p2pn1p/4N2P/3Q1PP1/8/PPq2P2/K2R3R w - - 0 1","s":["Qxd8+","Rxd8+"],"y":["Rxd8"],"r":600,"m":"Kingside attack","n":0},{"f":"8/8/6p1/5kPp/7P/4K3/8/8 b - - 0 1","s":["Kg4","Kxh4"],"y":["Ke4"],"r":600,"m":"Winning tactic","n":0},{"f":"6k1/1R3p1p/6p1/1p1r1b2/8/2Bp3P/6P1/6K1 w - - 0 1","s":["Rb8+","Rxc8+","Rxd8+"],"y":["Bc8","Rd8"],"r":607,"m":"Mate in 3","n":3},{"f":"8/pB3k1p/6p1/1P6/P1r2PP1/7P/7K/8 w - - 0 1","s":["Bd5+","Bxc4"],"y":["Ke7"],"r":607,"m":"Fork","n":0},{"f":"1k6/pp6/4nNp1/P3r2p/3p4/7P/3R1PPK/8 w - - 0 1","s":["Nd7+","Nxe5"],"y":["Kc7"],"r":609,"m":"Fork","n":0},{"f":"r4rk1/ppp2ppp/2n5/8/3PnB2/P3P3/3qQPPP/1R2K2R w K - 0 1","s":["Qxd2","Kxd2"],"y":["Nxd2"],"r":609,"m":"Winning tactic","n":0},{"f":"8/3k1pp1/4p1p1/7n/1p1PP2P/pP1K1P2/B5P1/8 b - - 0 1","s":["Nf4+","Nxg2"],"y":["Kc4"],"r":610,"m":"Winning tactic","n":0},{"f":"2rq3k/p3b1pp/1p1p1r2/2pQ2B1/4P3/2P3P1/P1P4P/3R1RK1 b - - 0 1","s":["Rxf1+","Bxg5"],"y":["Rxf1"],"r":610,"m":"Discovered attack","n":0},{"f":"8/8/8/P7/5p2/8/4K1k1/8 b - - 0 1","s":["f3+","f2"],"y":["Ke3"],"r":610,"m":"Winning tactic","n":0},{"f":"rn2kb1r/ppp1qppp/5n2/8/2bP4/8/PP2QPPP/RNB1KBNR w KQkq - 0 1","s":["Qxe7+","Bxc4"],"y":["Bxe7"],"r":614,"m":"Discovered attack","n":0},{"f":"2r4k/1p2bp1p/p1n1p1pq/3pP1N1/3P2Q1/1P6/P4PPP/3R2K1 w - - 0 1","s":["Nxf7+","Nxh6"],"y":["Kg7"],"r":617,"m":"Fork","n":0},{"f":"rnb1k1nr/ppp2ppp/3b4/8/8/5NP1/PPPPP3/RNBQKB1R b KQkq - 0 1","s":["Bxg3+"],"y":[],"r":617,"m":"Boden mate","n":1},{"f":"8/1K6/8/6kp/8/8/P7/8 b - - 0 1","s":["h4","h3","h2","h1=Q"],"y":["a4","a5","Kb8"],"r":621,"m":"Promotion","n":0},{"f":"r4r1k/2p5/p2p1q1p/1p1Pp1p1/4P3/PB1P1Qpb/1PP2R2/4R1K1 w - - 0 1","s":["Qxf6+","Rxf6"],"y":["Rxf6"],"r":621,"m":"Kingside attack","n":0},{"f":"8/8/8/1K4p1/P7/5k2/8/8 w - - 0 1","s":["a5","a6","a7","a8=Q"],"y":["g4","g3","Kf2"],"r":621,"m":"Promotion","n":0},{"f":"8/1p1n2p1/p1k4p/P2p4/6R1/2P2K1P/1P6/8 b - - 0 1","s":["Ne5+","Nxg4"],"y":["Kf4"],"r":625,"m":"Fork","n":0},{"f":"6k1/5p1p/6p1/3b4/1p2N3/8/5PPP/6K1 w - - 0 1","s":["Nf6+","Nxd5"],"y":["Kg7"],"r":628,"m":"Fork","n":0},{"f":"r7/5ppp/8/1pk5/2b5/5P2/PK1R2PP/2R5 b - - 0 1","s":["Rxa2+","Rxd2"],"y":["Kb1"],"r":659,"m":"Skewer","n":0},{"f":"8/5k2/6R1/4PpKp/7P/5rP1/8/8 b - - 0 1","s":["Rxg3+","Rxg6"],"y":["Kf4"],"r":665,"m":"Skewer","n":0},{"f":"4r3/1p2r1k1/p2p4/4bpp1/3B2n1/1BP3PP/PP2R3/4R1K1 b - - 0 1","s":["Bxd4+","Rxe2","Rxe2"],"y":["cxd4","Rxe2"],"r":671,"m":"Discovered attack","n":0},{"f":"2r3k1/2q2ppp/4p3/8/pPrPQ3/P7/1P1R1PPP/1K2R3 b - - 0 1","s":["Rc1+","Qxc1+"],"y":["Rxc1"],"r":671,"m":"Queenside attack","n":0},{"f":"4r1k1/ppp1q1b1/3p2pp/2nP4/2P2P2/3QR3/PP4PP/R5K1 w - - 0 1","s":["Rxe7","Rxe8+"],"y":["Nxd3"],"r":678,"m":"Kingside attack","n":0},{"f":"8/3k1p1p/r2P2p1/pp6/2pK4/2P2P2/P1P3PP/3R4 b - - 0 1","s":["Rxd6+","Rxd1"],"y":["Kc5"],"r":680,"m":"Skewer","n":0},{"f":"3r3k/ppp3pp/2n2p2/2q5/Q1P5/8/PP3PPP/3R2K1 w - - 0 1","s":["Rxd8+","Qe8+","Qxf8+"],"y":["Nxd8","Qf8"],"r":680,"m":"Mate in 3","n":3},{"f":"r4r2/1pp1Nppk/3p4/p3n3/4P3/1PPP2P1/1P1K2P1/3R4 w - - 0 1","s":["Rh1+"],"y":[],"r":697,"m":"Anastasia mate","n":1},{"f":"6k1/7p/2P3p1/8/2K2pP1/5r2/8/8 w - - 0 1","s":["c7","c8=Q+"],"y":["Re3"],"r":699,"m":"Promotion","n":0},{"f":"6k1/6pp/p1N5/1pP2bp1/5P2/8/PPP5/3K4 w - - 0 1","s":["Ne7+","Nxf5"],"y":["Kf7"],"r":700,"m":"Fork","n":0},{"f":"2r2rk1/6p1/1q2p2p/p1ppP1N1/3P1p1P/2PQ2n1/PP4P1/R1B3K1 w - - 0 1","s":["Qh7+"],"y":[],"r":700,"m":"Mate in 1","n":1},{"f":"2r5/2r2pk1/2P5/4nppP/R7/4P3/P4KB1/2R5 b - - 0 1","s":["Nd3+","Nxc1+"],"y":["Ke2"],"r":700,"m":"Fork","n":0},{"f":"5k2/7p/p3p1p1/1pN2pb1/8/P1P2P1P/1P4P1/6K1 b - - 0 1","s":["Be3+","Bxc5"],"y":["Kf1"],"r":700,"m":"Fork","n":0},{"f":"6k1/2p2ppp/pnp5/B7/2P3PP/1P2PPR1/r3b2r/3R2K1 w - - 0 1","s":["Rd8+"],"y":[],"r":701,"m":"Back-rank mate","n":1},{"f":"r4rk1/p5pp/8/5pN1/P2R1n2/8/5PPP/R5K1 b - - 0 1","s":["Ne2+","Nxd4"],"y":["Kf1"],"r":701,"m":"Fork","n":0},{"f":"6k1/pp3p1p/4bP2/1B4P1/8/2R5/r2r3P/4R1K1 w - - 0 1","s":["Rc8+","Rxd8+"],"y":["Rd8"],"r":701,"m":"Mate in 2","n":2},{"f":"6k1/rb3p2/pq2r1pp/1p1n4/2pN4/2P4P/1PQ3P1/1B1RR1K1 w - - 0 1","s":["Rxe6","Qxg6+"],"y":["fxe6"],"r":702,"m":"Remove the defender","n":0},{"f":"8/8/1R1n4/3k1p2/4b1p1/4P1P1/3K1P2/8 b - - 0 1","s":["Nc4+","Nxb6"],"y":["Kc3"],"r":702,"m":"Fork","n":0},{"f":"6k1/5ppp/4p3/3n4/2rB4/1r4P1/5PKP/R2q4 w - - 0 1","s":["Ra8+","Rxb8+","Rxc8+"],"y":["Rb8","Rc8"],"r":703,"m":"Mate in 3","n":3},{"f":"r1b2b1r/pp1p4/2pk1qpp/4p3/3p4/1B3Q2/PPPP1PPP/R1B1K2R w KQ - 0 1","s":["Qxf6+"],"y":[],"r":703,"m":"Winning tactic","n":0},{"f":"6k1/6pp/p3p3/4Np2/1p1rbP2/1P5P/P5PK/2R5 w - - 0 1","s":["Rc8+","Rxd8+"],"y":["Rd8"],"r":704,"m":"Mate in 2","n":2},{"f":"B7/p1k3r1/1p6/8/PPP5/4p1r1/4RR2/5K2 b - - 0 1","s":["Rg1+"],"y":[],"r":704,"m":"Mate in 1","n":1},{"f":"8/1p1k1n1p/p7/4PPP1/P4K2/2P5/8/8 w - - 0 1","s":["e6+","exf7"],"y":["Ke7"],"r":705,"m":"Fork","n":0},{"f":"r3r2k/p5p1/1p4Pp/8/4Q3/1P4q1/P5P1/4RRK1 w - - 0 1","s":["Qxe8+","Rxe8+"],"y":["Rxe8"],"r":705,"m":"Mate in 2","n":2},{"f":"6k1/5ppp/4b3/4P3/2pQ1P2/4K1P1/r6P/3B3q w - - 0 1","s":["Qd8+"],"y":[],"r":705,"m":"Back-rank mate","n":1},{"f":"5rk1/6pp/3R4/p7/1p5q/1P1Q4/2B3PP/4R2K b - - 0 1","s":["Qxe1+","Rxf1+"],"y":["Qf1"],"r":706,"m":"Back-rank mate","n":2},{"f":"4b3/8/pp1p1p2/2pPpP2/P1P1P2k/1P3K2/8/3N4 b - - 0 1","s":["Bh5+","Bxd1"],"y":["Ke3"],"r":706,"m":"Skewer","n":0},{"f":"1R6/R1p2kpp/5p2/8/8/2n5/P1r2PPP/5K2 b - - 0 1","s":["Rc1+"],"y":[],"r":707,"m":"Mate in 1","n":1},{"f":"1k6/ppp5/3pr3/5p1p/3P4/2P3R1/P1KP4/8 w - - 0 1","s":["Rg8+","Rxe8+"],"y":["Re8"],"r":707,"m":"Back-rank mate","n":2},{"f":"8/5p1Q/2rk4/3b4/7P/6P1/5P2/6K1 b - - 0 1","s":["Rc1+","Rh1+"],"y":["Kh2"],"r":708,"m":"Mate in 2","n":2},{"f":"7k/5Prp/pp3Q2/2ppP2p/Pn1Pq3/1P6/1B2B1NP/5RK1 b - - 0 1","s":["Qxg2+"],"y":[],"r":708,"m":"Mate in 1","n":1},{"f":"5rk1/p5pp/2ppp3/4p2R/4N1Q1/8/PPP3P1/1K6 b - - 0 1","s":["Rf1+","Rxd1+"],"y":["Qd1"],"r":709,"m":"Back-rank mate","n":2},{"f":"r1b2rk1/p5pp/1q1Qpp2/3p3n/3P1P2/2PB4/PP4PP/RNB2RK1 b - - 0 1","s":["Qxd6"],"y":[],"r":709,"m":"Winning tactic","n":0},{"f":"6k1/3nBppp/1p6/3p4/4q3/Q3P1P1/5P1P/6K1 w - - 0 1","s":["Qa8+","Qxb8+"],"y":["Nb8"],"r":709,"m":"Back-rank mate","n":2},{"f":"1k6/ppp4B/2np2p1/4p2b/1P2q3/1QP4P/PN4PK/8 w - - 0 1","s":["Qg8+","Qxd8+"],"y":["Nd8"],"r":709,"m":"Mate in 2","n":2},{"f":"8/7R/4b3/8/5k1K/8/PP1r4/6R1 b - - 0 1","s":["Rh2+"],"y":[],"r":709,"m":"Mate in 1","n":1},{"f":"2q1r1k1/p3rpp1/1p1b4/2pP1N1p/2P5/3Q2P1/PP3P1P/3RR1K1 b - - 0 1","s":["Rxe1+","Rxe1+"],"y":["Rxe1"],"r":710,"m":"Kingside attack","n":0},{"f":"4r1k1/ppb2pp1/2q5/3B3p/1P1p4/P2P1K2/3B1P2/6RQ b - - 0 1","s":["Qxd5+"],"y":[],"r":711,"m":"Mate in 1","n":1},{"f":"8/8/p5p1/1p3pPp/5P1P/P1Bp1K2/1Pk5/8 b - - 0 1","s":["d2","Kxd2"],"y":["Bxd2"],"r":711,"m":"Winning tactic","n":0},{"f":"6k1/p5rp/p3p1p1/1b1rN3/4p3/PP2K3/7P/2R5 w - - 0 1","s":["Rc8+","Rxd8+","Rxe8+"],"y":["Rd8","Be8"],"r":713,"m":"Mate in 3","n":3},{"f":"6k1/3b1rpp/2pBp3/3p2P1/pP5P/P1Pn2R1/4q3/4R1K1 w - - 0 1","s":["Rxe2"],"y":[],"r":715,"m":"Winning tactic","n":0},{"f":"7k/1q3pbp/4p1p1/3p4/Q2P3P/K1n1P3/P3r1P1/2r5 w - - 0 1","s":["Qe8+","Qxf8+"],"y":["Bf8+"],"r":715,"m":"Mate in 2","n":2},{"f":"8/8/8/8/5pp1/6P1/4kP2/6K1 w - - 0 1","s":["gxf4","f5"],"y":["Kf3"],"r":716,"m":"Defensive move","n":0},{"f":"7k/8/2p1p3/1pPpP2p/pP6/P2P3P/1B2n1K1/8 b - - 0 1","s":["Nf4+","Nxd3"],"y":["Kf3"],"r":720,"m":"Winning tactic","n":0},{"f":"8/7p/P2pqk2/1Qp5/5p2/5P2/4r1PP/3R3K b - - 0 1","s":["Re1+","Rxf1+"],"y":["Qf1"],"r":721,"m":"Winning tactic","n":0},{"f":"6k1/5p2/6p1/K1R2r1p/1P6/8/8/8 w - - 0 1","s":["Rxf5","b5","b6","b7"],"y":["gxf5","f4","Kg7"],"r":728,"m":"Quiet move","n":0},{"f":"6k1/4rppp/B7/2rpp3/P7/R1n1P3/5PPP/2R3K1 b - - 0 1","s":["Ne2+","Rxc1+"],"y":["Bxe2"],"r":728,"m":"Discovered attack","n":0},{"f":"2r2k2/5pp1/p2q4/1n1P3Q/1p5R/1P4P1/5P1P/6K1 w - - 0 1","s":["Qh8+","Qxc8"],"y":["Ke7"],"r":728,"m":"Skewer","n":0},{"f":"6k1/p3rp2/1p1p2b1/3P2q1/PP1B2p1/8/5PPK/2R5 w - - 0 1","s":["Rc8+","Rxe8+","Rh8+"],"y":["Re8","Kh7"],"r":737,"m":"Mate in 3","n":3},{"f":"r1b2rk1/1p3pb1/p2p2p1/3P4/B3PB1p/2N4n/PP3RPP/RQ4NK b - - 0 1","s":["Nxf2+"],"y":[],"r":741,"m":"Smothered mate","n":1},{"f":"2b1r1k1/4r1pp/p7/1p1p1p2/P2P1B2/2PQ2Pq/1P1N3P/R3R1K1 b - - 0 1","s":["Rxe1+","Rxe1+"],"y":["Rxe1"],"r":742,"m":"Kingside attack","n":0},{"f":"6k1/3R3p/5p2/p1P5/2PK2P1/4P3/7P/r7 b - - 0 1","s":["Rd1+","Rxd7"],"y":["Kc3"],"r":742,"m":"Skewer","n":0},{"f":"3r1k1r/1b3ppp/2q2b2/P4P2/1P6/3Q4/2P2PPP/3RR1K1 w - - 0 1","s":["Qxd8+","Rxd8+","Rexe8+"],"y":["Bxd8","Qe8"],"r":745,"m":"Mate in 3","n":3},{"f":"8/8/p1R2K1k/6r1/8/P7/8/8 b - - 0 1","s":["Rg6+","Rxc6"],"y":["Ke5"],"r":746,"m":"Skewer","n":0},{"f":"r5rk/1p4bp/2b3pN/2P4q/1P2R3/P4pP1/5P1P/2R2BK1 w - - 0 1","s":["Nf7+"],"y":[],"r":757,"m":"Smothered mate","n":1},{"f":"r1b1k2r/ppp1qppp/3p1n2/4n3/2BQ4/5N2/PP3PPP/RNB1R1K1 b kq - 0 1","s":["Nxf3+","Qxe1+"],"y":["gxf3"],"r":763,"m":"Discovered attack","n":0},{"f":"5k2/5p1p/p3bBp1/4P3/2r4P/8/R4PP1/6K1 b - - 0 1","s":["Rc1+","Bxa2"],"y":["Kh2"],"r":764,"m":"Discovered attack","n":0},{"f":"8/8/p7/7p/1k5P/5PK1/6P1/8 b - - 0 1","s":["a5","a4"],"y":["Kf4"],"r":764,"m":"Quiet move","n":0},{"f":"3r2k1/1p3p1p/3Pp1p1/3p4/3b4/6P1/R4PKP/R7 w - - 0 1","s":["Ra8","Rxd8+"],"y":["Bxa1"],"r":765,"m":"Pin","n":0},{"f":"8/p1k2ppp/3n4/2pP1P2/BK3B1P/P7/4rP2/8 w - - 0 1","s":["Kxc5","Bxd6+"],"y":["Re4"],"r":776,"m":"Pin","n":0},{"f":"k7/8/pK4p1/6P1/6P1/8/8/8 w - - 0 1","s":["Kxa6","Kb6","Kc6","Kd6"],"y":["Kb8","Kc8","Kd8"],"r":777,"m":"Defensive move","n":0},{"f":"4r1k1/p5pp/2r2p2/2B5/4NP2/3p2P1/P4K1P/4R3 w - - 0 1","s":["Nxf6+","Rxe8+"],"y":["gxf6"],"r":778,"m":"Discovered attack","n":0},{"f":"8/8/2B5/4pK2/3k1pPp/7P/8/6n1 w - - 0 1","s":["g5","g6"],"y":["Ne2"],"r":785,"m":"Quiet move","n":0},{"f":"5r1k/5p2/p2pqN1b/1r4R1/p1p1P1R1/6PP/6PK/8 w - - 0 1","s":["Rg8+","Rxg8+"],"y":["Rxg8"],"r":785,"m":"Arabian mate","n":2},{"f":"1k2r3/2p1r1p1/p2b3p/1p2n1p1/1P1B4/1BP4P/P4PP1/3RR1K1 b - - 0 1","s":["Nf3+","Rxe1+","Rxe1+"],"y":["gxf3","Rxe1"],"r":785,"m":"Discovered attack","n":0},{"f":"4r1k1/pp3ppp/2r1q3/3pn3/5P1Q/P1P3RP/2P1R1P1/2B3K1 b - f3 0 1","s":["Nf3+","Qxe2"],"y":["Rxf3"],"r":795,"m":"Discovered attack","n":0},{"f":"5r2/R2R1pk1/P7/5p2/6p1/1KP5/5r2/8 w - - 0 1","s":["Rxf7+","Rxf7+","a7"],"y":["Rxf7","Kxf7"],"r":796,"m":"Sacrifice","n":0},{"f":"6rk/1pR3p1/6Bp/2b4P/8/pP3PK1/P1P5/8 b - - 0 1","s":["Bd6+","Bxc7"],"y":["f4"],"r":800,"m":"Fork","n":0},{"f":"5rk1/6p1/8/8/4P1B1/1r3pKP/5P2/4R3 w - - 0 1","s":["Be6+","Bxb3"],"y":["Kh7"],"r":800,"m":"Fork","n":0},{"f":"4r1k1/1pp2ppp/1b2b3/3q4/Q2Pn3/5N2/4BPPP/B4RK1 w - - 0 1","s":["Qxe8+"],"y":[],"r":800,"m":"Mate in 1","n":1},{"f":"1k6/ppr4b/8/8/3P4/3q3P/PP4P1/K1R2R2 w - - 0 1","s":["Rf8+","Rcxc8+"],"y":["Rc8"],"r":801,"m":"Mate in 2","n":2},{"f":"5rB1/pb2k3/1p6/3pN3/2PP4/8/PPK5/8 w - - 0 1","s":["Ng6+","Nxf8"],"y":["Ke8"],"r":801,"m":"Fork","n":0},{"f":"k2r3r/p2q1pb1/2R5/4P2p/4Q1p1/PP2B3/4NPPP/R5K1 b - - 0 1","s":["Qd1+","Rxd1+"],"y":["Rxd1"],"r":802,"m":"Back-rank mate","n":2},{"f":"8/1b5P/4N1K1/8/2pp4/2k3P1/8/8 b - - 0 1","s":["Be4+","Bxh7"],"y":["Kh5"],"r":803,"m":"Skewer","n":0},{"f":"r6k/7p/2p3pQ/1p2p3/1P1pP1q1/3P4/p1P5/K4R2 w - - 0 1","s":["Rf8+","Qxf8+"],"y":["Rxf8"],"r":803,"m":"Mate in 2","n":2},{"f":"2r3k1/1p3pp1/p7/3P3p/P4R1P/1P3bB1/3R1P2/5K2 b - - 0 1","s":["Rc1+","Rxd1+"],"y":["Rd1"],"r":804,"m":"Mate in 2","n":2},{"f":"8/p2q1k1p/Qp2R1p1/5p2/2P5/1P6/5PPP/6K1 b - - 0 1","s":["Qd1+","Qxe1+"],"y":["Re1"],"r":804,"m":"Mate in 2","n":2},{"f":"8/6k1/1R2pr2/6Kp/p6P/P7/1P2R3/8 b - - 0 1","s":["Rf5+"],"y":[],"r":805,"m":"Mate in 1","n":1},{"f":"4kR2/1p2p2P/2p2b2/p2p4/3Pnp2/3K4/PP6/6R1 b - - 0 1","s":["Kxf8","Kf7","Bxh8"],"y":["Rg8+","h8=Q"],"r":805,"m":"Winning tactic","n":0},{"f":"8/4k1K1/5p2/1p1n3P/6P1/8/8/8 w - - 0 1","s":["h6","h7","h8=Q"],"y":["Ne3","Nxg4"],"r":805,"m":"Promotion","n":0},{"f":"3qr1k1/1r3ppp/p7/2pP1b2/4RB2/1P1Q1N2/P1N2PPP/2b3K1 w - - 0 1","s":["Rxe8+","Qxf5"],"y":["Qxe8"],"r":805,"m":"Discovered attack","n":0},{"f":"6R1/8/Kpk1p3/1p1pP3/6P1/PPr5/8/8 w - - 0 1","s":["Rc8+","Rxc3"],"y":["Kd7"],"r":806,"m":"Skewer","n":0},{"f":"3R1k2/p4ppp/b1r1n3/8/8/3p1B2/P5PP/3R2K1 b - - 0 1","s":["Nxd8","Nxc6"],"y":["Bxc6"],"r":806,"m":"Winning tactic","n":0},{"f":"7r/3q1k2/Q1R3p1/P2p4/2nPpPp1/6P1/5K1r/R4N2 w - - 0 1","s":["Nxh2","Kg1"],"y":["Rxh2+"],"r":807,"m":"Winning tactic","n":0},{"f":"8/8/8/3N1P2/5K2/1kp5/8/8 b - - 0 1","s":["c2","c1=Q"],"y":["Ke5"],"r":807,"m":"Promotion","n":0},{"f":"r5k1/pp3ppp/2n1r3/8/8/2N1qB2/PPQ3PP/4RK1R b - - 0 1","s":["Qxe1+"],"y":[],"r":808,"m":"Mate in 1","n":1},{"f":"2k5/2p2R2/2Pp1p2/2r1p1p1/8/1P1P4/2PK1P2/8 w - - 0 1","s":["Rf8+"],"y":[],"r":808,"m":"Mate in 1","n":1},{"f":"4r2r/1ppk4/p1b1p1p1/5pq1/P1BP1P1p/4P2P/2P3P1/R1Q2RK1 b - f3 0 1","s":["Qxg2+"],"y":[],"r":809,"m":"Mate in 1","n":1},{"f":"5rk1/5pp1/p2P3p/1p2p3/1P2P3/6P1/P1n3KP/5Q2 b - - 0 1","s":["Ne3+","Nxf1"],"y":["Kg1"],"r":809,"m":"Fork","n":0},{"f":"r5k1/P5p1/7p/2Pp4/3Ppp2/6q1/1R4B1/R3N1K1 w - - 0 1","s":["Rb8+","Rxa8"],"y":["Kh7"],"r":809,"m":"Winning tactic","n":0},{"f":"2r3k1/p5pp/2B5/N4p2/8/3n3P/Pr2bPP1/R1R4K w - - 0 1","s":["Bd5+","Rxc8+"],"y":["Kf8"],"r":811,"m":"Discovered attack","n":0},{"f":"b4rk1/2pR2p1/1p4q1/6N1/7Q/4B3/1P3PPP/6K1 b - - 0 1","s":["Qb1+","Qxc1+","Qxd1+"],"y":["Bc1","Rd1"],"r":812,"m":"Mate in 3","n":3},{"f":"2r5/1p1q3k/p5pp/2Prn3/1Q2Np2/5P1P/5P1B/R4K2 w - - 0 1","s":["Nf6+","Nxd7"],"y":["Kg7"],"r":812,"m":"Fork","n":0},{"f":"r4rk1/ppp2ppp/2p5/6qn/N2PP3/5N1b/PPP2PP1/R2Q1RK1 b - - 0 1","s":["Qxg2+"],"y":[],"r":812,"m":"Mate in 1","n":1},{"f":"8/8/Q6p/2R3pk/5n2/4pNKb/1r6/8 b - - 0 1","s":["Rg2+"],"y":[],"r":813,"m":"Hook mate","n":1},{"f":"1k4r1/pp3p2/4p3/2N1q3/1P1bp3/P3P3/5P2/2RR1K2 w - - 0 1","s":["Nd7+","Nxe5"],"y":["Ka8"],"r":815,"m":"Fork","n":0},{"f":"2r3k1/p4ppp/1p3q2/3bR3/7N/P5P1/1P3P1P/4R1K1 w - - 0 1","s":["Re8+","Rxe8+"],"y":["Rxe8"],"r":815,"m":"Back-rank mate","n":2},{"f":"1k1r1br1/ppp5/5q2/4pP2/6P1/3Q1P1p/PPP5/3RR1K1 w - - 0 1","s":["Qxd8+","Rxd8+"],"y":["Qxd8"],"r":817,"m":"Back-rank mate","n":2},{"f":"5r2/5r2/p6k/1pNp2pp/1P1q4/P2B3P/3Q2P1/2R4K b - - 0 1","s":["Rf1+","Rxf1+","Qxd2"],"y":["Rxf1","Bxf1"],"r":817,"m":"Winning tactic","n":0},{"f":"rn1RB3/r2R1pkp/p4p2/1pp1pP2/4P3/8/PPP3PP/6K1 b - - 0 1","s":["Nxd7","Rxa8"],"y":["Rxa8"],"r":818,"m":"Winning tactic","n":0},{"f":"6r1/p7/1ppkp1r1/4Np2/3P1P2/P1P2K1P/1P1R2P1/8 b - - 0 1","s":["Rg3+","Rxg2+"],"y":["Ke2"],"r":819,"m":"Interference","n":0},{"f":"6k1/1R3pp1/4n3/4N3/7P/3r4/P4PKP/8 b - - 0 1","s":["Nf4+","Rd1+"],"y":["Kf1"],"r":819,"m":"Mate in 2","n":2},{"f":"8/8/p1p5/Pp1p3p/1P1Pk1P1/2P3P1/4K3/8 b - - 0 1","s":["hxg4","Kf3"],"y":["Kd2"],"r":820,"m":"Zugzwang","n":0},{"f":"8/8/8/2k5/r7/3K2R1/8/8 b - - 0 1","s":["Ra3+","Rxg3"],"y":["Ke4"],"r":821,"m":"Skewer","n":0},{"f":"r2r2k1/p1p2ppp/2p1p3/4P3/N2R4/1q5P/2b2BP1/3Q1RK1 w - - 0 1","s":["Rxd8+","Qxd8+"],"y":["Rxd8"],"r":822,"m":"Back-rank mate","n":2},{"f":"4r1k1/ppq2pp1/2p1r1N1/6Q1/1P6/P2P3P/2P2PP1/1R2R1K1 b - - 0 1","s":["Rxe1+","Rxe1+"],"y":["Rxe1"],"r":822,"m":"Mate in 2","n":2},{"f":"rn1qr1k1/1p3ppp/2p2b2/p2p4/3P4/2N2N2/PPP1QPPP/2KRR3 w - - 0 1","s":["Qxe8+","Rxe8+"],"y":["Qxe8"],"r":824,"m":"Back-rank mate","n":2},{"f":"8/4k3/pq2pr2/1p1pQ3/8/P7/1P3PPP/2R3K1 b - - 0 1","s":["Qxf2+","Qf1+","Rxf1+"],"y":["Kh1","Rxf1"],"r":825,"m":"Back-rank mate","n":3},{"f":"8/pp2r2p/2p1k2b/4P3/4K3/1PP5/P4P1P/3R4 w - - 0 1","s":["Rd6+","Rxh6"],"y":["Kf7"],"r":826,"m":"Skewer","n":0},{"f":"1rbq2k1/5pp1/p6p/1pbBr3/7P/P3P1P1/1PP2P2/R2Q1RK1 w - - 0 1","s":["Bxf7+","Qxd8"],"y":["Kxf7"],"r":828,"m":"Discovered attack","n":0},{"f":"8/8/p4k2/P2p3p/3P3P/5K2/8/8 b - - 0 1","s":["Kf5","Kg4"],"y":["Ke3"],"r":834,"m":"Zugzwang","n":0},{"f":"1r5k/p5pp/5p2/2N5/P2P1b2/B6P/4RPP1/7K b - - 0 1","s":["Rb1+","Rxc1+","Rxe1+"],"y":["Bc1","Re1"],"r":838,"m":"Mate in 3","n":3},{"f":"5rk1/ppr1ppbp/6p1/8/2BPn3/1R2PNP1/5PP1/2R3K1 w - - 0 1","s":["Bxf7+","Rxc7"],"y":["Kxf7"],"r":840,"m":"Discovered attack","n":0},{"f":"r6r/1p1k2p1/p2p1q1p/3QRb2/8/1PP5/P4PPP/R1B3K1 b - - 0 1","s":["Qxe5","Ke6"],"y":["Qxb7+"],"r":841,"m":"Defensive move","n":0},{"f":"3r1rk1/p4pp1/1p5p/2pB4/2P5/1P1R3P/1b3PP1/3R2K1 w - - 0 1","s":["Bxf7+","Rxd8"],"y":["Kxf7"],"r":843,"m":"Discovered attack","n":0},{"f":"1r3r2/pb2Q2k/1p5p/2pq1pp1/8/N1PP4/PP3PPP/R3R1K1 b - - 0 1","s":["Rf7","Qxf7"],"y":["Qxf7+"],"r":845,"m":"Defensive move","n":0},{"f":"6R1/ppp3P1/4k3/2qp4/8/1P6/PK6/8 w - - 0 1","s":["Re8+","g8=Q"],"y":["Kd7"],"r":849,"m":"Clearance","n":0},{"f":"8/1p3Rp1/p1p3r1/P1P5/1P3k1K/7P/8/8 b - - 0 1","s":["Rf6","gxf6"],"y":["Rxf6+"],"r":850,"m":"Defensive move","n":0},{"f":"1r4nk/p3brpp/b1p4N/q2p4/5P2/1P1pP3/PBP2RPP/R5K1 w - - 0 1","s":["Nxf7+"],"y":[],"r":850,"m":"Smothered mate","n":1},{"f":"8/8/8/r3kPR1/1p6/3K4/8/8 w - - 0 1","s":["f6+","Rxa5"],"y":["Kxf6"],"r":857,"m":"Skewer","n":0},{"f":"r5k1/5ppp/2bpp3/1pp5/4P1P1/1PqP1N2/2P1RPP1/R1Q3K1 b - - 0 1","s":["Rxa1","Qxa1+"],"y":["Qxa1"],"r":862,"m":"Pin","n":0},{"f":"3r1r2/8/2Q1k1p1/3ppq2/8/2P3P1/PP3PK1/3R3R b - - 0 1","s":["Rd6","Kxd6"],"y":["Qxd6+"],"r":863,"m":"Defensive move","n":0},{"f":"r4r2/p3Nppk/4n3/4R3/q7/1N4P1/P4PKP/5R2 w - - 0 1","s":["Rh5+"],"y":[],"r":865,"m":"Anastasia mate","n":1},{"f":"r2q1kr1/1bp1bp2/p7/1p2p3/2p1P1Q1/3PB2P/PPP2PP1/R3K2R w KQ - 0 1","s":["Bh6+","Qxg8+"],"y":["Ke8"],"r":866,"m":"Deflection","n":0},{"f":"1r2k1nr/N3pp1p/6p1/8/8/8/PbP2PPP/1RB1K2R b Kk - 0 1","s":["Bc3+","Rxb1"],"y":["Ke2"],"r":867,"m":"Discovered attack","n":0},{"f":"2r3k1/pp3pp1/1b5p/1B3N2/1P2nP1P/P5P1/6K1/2B5 w - - 0 1","s":["Ne7+","Nxc8"],"y":["Kf8"],"r":900,"m":"Fork","n":0},{"f":"8/8/p2k1p1p/1p1Pb1p1/1P2P1P1/P3K2P/8/2B5 b - - 0 1","s":["Bf4+","Bxc1"],"y":["Kd3"],"r":901,"m":"Skewer","n":0},{"f":"3rr1k1/p3bpp1/2p1q2p/2p1P3/2Np2R1/1PnP2QP/P1P2PP1/R1B3K1 b - - 0 1","s":["Ne2+","Nxg3+"],"y":["Kh1"],"r":903,"m":"Fork","n":0},{"f":"5b2/1Q5p/p4Nk1/1p3pP1/4pP2/1P5K/P1rq4/4R3 w - - 0 1","s":["Qxh7+"],"y":[],"r":903,"m":"Mate in 1","n":1},{"f":"3r1rk1/pp3ppp/1qp1p3/3n2N1/3P1PP1/3QP1K1/PP5P/5R2 w - - 0 1","s":["Qxh7+"],"y":[],"r":905,"m":"Mate in 1","n":1},{"f":"5r2/5p1k/2ppq1p1/4p1b1/4N2P/3P4/1P1R1P2/4K1R1 w - - 0 1","s":["Nxg5+","Nxe6"],"y":["Kh6"],"r":907,"m":"Fork","n":0},{"f":"8/8/4nk1p/1p1K1p2/p4P2/P1PB4/1P5P/8 b - - 0 1","s":["Nxf4+","Nxd3"],"y":["Kd4"],"r":907,"m":"Fork","n":0},{"f":"r1b1kb1r/ppp1pppp/5n2/8/3q4/3B4/PPP2PPP/R1BQ1RK1 w kq - 0 1","s":["Bb5+","Bxd7+"],"y":["Qd7"],"r":907,"m":"Winning tactic","n":0},{"f":"8/3R2p1/2p2pkp/1bB5/pP1K2PP/P4P2/4r3/8 b - h3 0 1","s":["Rd2+","Rxd7"],"y":["Kc3"],"r":908,"m":"Skewer","n":0},{"f":"8/p2r3p/4k3/8/4P3/3p2P1/PP3K1P/3B4 w - - 0 1","s":["Bg4+","Bxd7"],"y":["Ke5"],"r":908,"m":"Skewer","n":0},{"f":"2rr3k/p1q3pp/4Q3/3p4/1PnP1P2/2P5/P3RP1P/4R1K1 w - - 0 1","s":["Qe8+","Rxe8+","Rxe8+"],"y":["Rxe8","Rxe8"],"r":909,"m":"Back-rank mate","n":3},{"f":"5rk1/3q1p1p/3p4/2pN1p2/6P1/2P1BN2/1b1K3P/3R4 w - - 0 1","s":["Nf6+","Nxd7"],"y":["Kg7"],"r":911,"m":"Fork","n":0},{"f":"8/pR6/5ppk/8/2P4p/1P3P1P/P4BP1/4rn1K b - - 0 1","s":["Ng3+","Rh1+"],"y":["Kh2"],"r":911,"m":"Hook mate","n":2},{"f":"3r2k1/5ppp/R7/1p3P2/4NnP1/7P/PPP5/2K5 b - - 0 1","s":["Ne2+","Rd1+"],"y":["Kb1"],"r":911,"m":"Back-rank mate","n":2},{"f":"8/8/2k4P/1p5K/p6r/8/8/8 w - - 0 1","s":["Kxh4","h7"],"y":["a3"],"r":911,"m":"Winning tactic","n":0},{"f":"r2qkb2/pp1np3/2p1pprp/8/3P4/2NB1P2/PPP3PP/R3R1K1 w q - 0 1","s":["Bxg6+"],"y":[],"r":911,"m":"Mate in 1","n":1},{"f":"4r1k1/p3qpb1/1pp3pp/8/P1P1N1P1/1P3Q1P/4R1K1/8 w - - 0 1","s":["Nf6+","Rxe7"],"y":["Bxf6"],"r":912,"m":"Fork","n":0},{"f":"8/6pk/R6p/P7/6PK/r7/8/8 b - - 0 1","s":["g5+","Rh3+"],"y":["Kh5"],"r":912,"m":"Mate in 2","n":2},{"f":"r5k1/5ppp/6n1/p1P1p3/4QP2/7b/PP5P/R1Br1RK1 b - - 0 1","s":["Rxf1+"],"y":[],"r":912,"m":"Mate in 1","n":1},{"f":"2r3k1/5p2/2p2qp1/2p5/6P1/1rP4Q/4R3/4R1K1 w - - 0 1","s":["Re8+","Rxe8+","Qh8+"],"y":["Rxe8","Kg7"],"r":912,"m":"Mate in 3","n":3},{"f":"2r1kb1r/1p3ppp/p7/3ppP2/8/1P1PBP2/P4RPP/2R3K1 b k - 0 1","s":["Rxc1+","Bc5"],"y":["Bxc1"],"r":913,"m":"Pin","n":0},{"f":"4rqk1/1b3pbp/pp1p1np1/2pP4/2P1N3/3BQN1P/PP3PP1/4R1K1 w - - 0 1","s":["Nxf6+","Qxe8"],"y":["Bxf6"],"r":914,"m":"Discovered attack","n":0},{"f":"1r3n2/p3p1kp/3p1n1N/1p3PPR/2r5/3B1P2/PPP5/1K1R4 b - - 0 1","s":["Nxh5","bxc4"],"y":["Bxc4"],"r":915,"m":"Winning tactic","n":0},{"f":"1k1r4/p1p4p/B7/1P1p1n1n/3P4/5R1P/6P1/6K1 w - - 0 1","s":["Rxf5"],"y":[],"r":915,"m":"Winning tactic","n":0},{"f":"2k1r3/pp1br3/2n4p/4Bp2/6q1/2QB4/PP4PP/R3R2K b - - 0 1","s":["Rxe5","Rxe5"],"y":["Rxe5"],"r":915,"m":"Winning tactic","n":0},{"f":"6k1/p5pp/8/5r2/8/2N4P/PPP2n2/2K2R2 b - - 0 1","s":["Nd3+","Rxf1"],"y":["Kd2"],"r":917,"m":"Discovered attack","n":0},{"f":"4r3/R4Nkp/8/p1p5/P3n1p1/1P6/2P2PPP/5K2 b - - 0 1","s":["Nd2+","Re1+"],"y":["Kg1"],"r":917,"m":"Back-rank mate","n":2},{"f":"r1b3k1/2p1r1p1/p1p1qp1P/8/3Pp3/2P1BPQ1/P1P3P1/R3K2R b KQ - 0 1","s":["exf3","Qxe3+","Rxe3+"],"y":["Qxf3","Qxe3"],"r":918,"m":"Pin","n":0},{"f":"4rrk1/pp3pp1/2q1b2p/3p4/1P6/3Q3P/P1B2PP1/2KnR3 w - - 0 1","s":["Qh7+"],"y":[],"r":918,"m":"Mate in 1","n":1},{"f":"r6r/4kppp/2pNpnq1/p1P1n3/8/B3P3/PP1Q1PPP/3R1RK1 b - - 0 1","s":["Nf3+","Nxd2"],"y":["Kh1"],"r":920,"m":"Pin","n":0},{"f":"r5r1/ppp2p1k/2np1P1q/6p1/4PNP1/1N6/PPP5/2KR3Q w - - 0 1","s":["Qxh6+","Rh1+"],"y":["Kxh6"],"r":920,"m":"Mate in 2","n":2},{"f":"r4rk1/5ppp/pQ1b1q2/8/1P6/P4N1P/5PP1/3R1RK1 b - - 0 1","s":["Bh2+","Qxb6"],"y":["Nxh2"],"r":920,"m":"Discovered attack","n":0},{"f":"r4q1k/3n1P1p/p3r1p1/1pp5/3pbQN1/8/PPP2PPP/3RR1K1 w - - 0 1","s":["Rxe4","Qxe4"],"y":["Rxe4"],"r":921,"m":"Winning tactic","n":0},{"f":"8/pR6/3k4/3Nn3/4P3/1KP5/8/4r3 b - - 0 1","s":["Rb1+","Rxb7"],"y":["Kc2"],"r":921,"m":"Skewer","n":0},{"f":"6rk/6qp/5R2/7N/8/2P5/1P4PP/5R1K b - - 0 1","s":["Qxg2+"],"y":[],"r":921,"m":"Mate in 1","n":1},{"f":"2kr1b1r/pbp5/1pn1q2p/3p1pp1/3P4/P1P1BQ1B/1P3P1P/R3K1R1 w Q - 0 1","s":["Bxf5","Qxf5+"],"y":["Qxf5"],"r":923,"m":"Pin","n":0},{"f":"4r1k1/2p1rpp1/p2b1n1p/1pBP4/1P6/P1NR3P/5PP1/3R2K1 b - - 0 1","s":["Re1+","Rxe1+"],"y":["Rxe1"],"r":923,"m":"Mate in 2","n":2},{"f":"1Rb2rk1/6p1/p2p2p1/B2P2P1/2Pp4/P6P/4BbK1/8 b - - 0 1","s":["Bxh3+","Rxb8"],"y":["Kxh3"],"r":924,"m":"Discovered attack","n":0},{"f":"5Q2/p5pk/1p2p2p/1R6/2RPp3/2P1q3/5nPP/5BK1 b - - 0 1","s":["Nh3+","Qg1+"],"y":["Kh1"],"r":925,"m":"Mate in 2","n":2},{"f":"4r1k1/5bp1/p4pBp/1p1p3P/8/4R3/PPP3P1/1K6 w - - 0 1","s":["Rxe8+","Bxe8"],"y":["Bxe8"],"r":927,"m":"X-ray attack","n":0},{"f":"8/7p/5Kpk/5p2/8/4p1r1/8/4R3 w - - 0 1","s":["Rh1+","Rxh3+"],"y":["Rh3"],"r":928,"m":"Mate in 2","n":2},{"f":"6k1/1R6/3p2rp/5p2/7q/8/P5P1/2R3K1 w - - 0 1","s":["Rc8+","Rxd8+"],"y":["Qd8"],"r":928,"m":"Mate in 2","n":2},{"f":"1k5r/ppp5/1r3pRp/4pB2/1n1pPP2/qP1P3P/2PQ1P2/1K4R1 w - - 0 1","s":["Rg8+","Rxg8+"],"y":["Rxg8"],"r":929,"m":"Back-rank mate","n":2},{"f":"rn3k2/5ppp/2p1r3/1p2n3/p7/2P2P2/PP4PP/R1B1RBK1 b - - 0 1","s":["Nxf3+","Rxe1"],"y":["gxf3"],"r":935,"m":"Discovered attack","n":0},{"f":"8/p2Q1qkp/5pp1/2p5/3b4/P6P/3B2P1/7K w - - 0 1","s":["Bh6+","Qxf7"],"y":["Kxh6"],"r":936,"m":"Deflection","n":0},{"f":"r1b3k1/pp4pp/1q6/3pN3/2pP4/7P/PP3QP1/R3K3 w Q - 0 1","s":["Qf7+","Qe8+"],"y":["Kh8"],"r":941,"m":"Back-rank mate","n":2},{"f":"3r4/6pp/pNnNpk2/1p6/3p1R2/8/PPP2PPK/8 b - - 0 1","s":["Ke5","Kxf4","Nxd8"],"y":["Nf7+","Nxd8"],"r":943,"m":"Defensive move","n":0},{"f":"8/8/8/1p5p/1P3P1k/4K3/8/8 b - - 0 1","s":["Kg4","h4"],"y":["Ke4"],"r":946,"m":"Defensive move","n":0},{"f":"5rkr/pp3ppp/5nN1/3pb3/8/8/PP3PPP/4R1K1 w - - 0 1","s":["Ne7+"],"y":[],"r":949,"m":"Smothered mate","n":1},{"f":"q3kb1r/p2n1ppp/4p3/5N2/3p4/2P3P1/P2BPP1P/R2QK2R b KQk - 0 1","s":["Qxh1+"],"y":[],"r":949,"m":"Back-rank mate","n":1},{"f":"r1b1k1r1/pp3pPp/2n1p1p1/1Bp2n2/3qN3/2NPp3/PPP3PP/R1BQ1RK1 b q - 0 1","s":["e2+"],"y":[],"r":950,"m":"Discovered attack","n":0},{"f":"4r1k1/4rppp/p1nq1n2/1pNp1N2/1P1P4/P2Q1P2/6PP/R3R1K1 b - - 0 1","s":["Rxe1+","Rxe1+"],"y":["Rxe1"],"r":954,"m":"Kingside attack","n":0},{"f":"r1b5/ppr2k1p/5p2/5p2/8/2P3P1/P4PP1/4RK1R w - - 0 1","s":["Rxh7+","Rxc7"],"y":["Kg6"],"r":957,"m":"Skewer","n":0},{"f":"2r5/p4pk1/1p2pqp1/3b4/6Q1/1P4N1/P1r2PPP/1R3RK1 w - - 0 1","s":["Nh5+","Nxf6"],"y":["Kf8"],"r":963,"m":"Pin","n":0},{"f":"2b3rk/3p2pp/p5nN/p1P5/1P5q/P4p2/5PPP/3R1RK1 w - - 0 1","s":["Nf7+"],"y":[],"r":966,"m":"Smothered mate","n":1},{"f":"r3k2r/pp3pp1/2n1p3/2bpPnP1/Q6p/2N5/PP1B2PP/R4R1K b kq - 0 1","s":["Ng3+","hxg3+","Rxh4+"],"y":["hxg3","Qh4"],"r":969,"m":"Mate in 3","n":3},{"f":"2k2b1r/7p/p2p4/2pB2R1/3pP3/1P1P4/2PK1P2/8 b - - 0 1","s":["Bh6","Bxg5"],"y":["f4"],"r":970,"m":"Pin","n":0},{"f":"r5k1/5p1p/p5p1/8/2Q5/1P4Nn/P5PP/6RK b - - 0 1","s":["Nf2+"],"y":[],"r":975,"m":"Smothered mate","n":1},{"f":"8/5K1p/1p5k/6p1/3brp2/5R2/8/8 w - - 0 1","s":["Rh3+"],"y":[],"r":1000,"m":"Mate in 1","n":1},{"f":"5rk1/Q4ppp/3R4/1N2p1b1/4P3/5q1P/PPP2P2/1K5R b - - 0 1","s":["Qxh1+","Qxd1+"],"y":["Rd1"],"r":1000,"m":"Mate in 2","n":2},{"f":"4k3/7R/1pp3r1/8/Pr5p/1B3K2/1PP5/8 w - - 0 1","s":["Bf7+","Bxg6+"],"y":["Ke7"],"r":1000,"m":"Fork","n":0},{"f":"r3nrk1/4bp2/2p1n2Q/3pqN2/8/2N3P1/P5BP/5RK1 w - - 0 1","s":["Nxe7+"],"y":[],"r":1000,"m":"Mate in 1","n":1},{"f":"r1b4Q/p1pp4/1p1b3R/4B1q1/3nP3/3P2kP/PPP3P1/RN4K1 b - - 0 1","s":["Bxe5","Qxe5"],"y":["Qxe5+"],"r":1001,"m":"Winning tactic","n":0},{"f":"4r1k1/4rp2/2p4p/p2PNQp1/8/2P5/Pq3PPP/R3R1K1 b - - 0 1","s":["Rxe5","Rxe5"],"y":["Qxe5"],"r":1002,"m":"Winning tactic","n":0},{"f":"5rr1/ppk5/n1pb1p2/3p1R1P/3P3P/P2B2P1/1P4K1/R1B5 b - - 0 1","s":["Rxg3+","Rxd3"],"y":["Kf2"],"r":1002,"m":"Fork","n":0},{"f":"5rk1/p2q2p1/1p2p1Np/3p3P/3Pb1P1/2P5/PP3R2/6K1 w - - 0 1","s":["Rxf8+","Rh8+"],"y":["Kh7"],"r":1003,"m":"Hook mate","n":2},{"f":"1k6/pp3pp1/5r2/1Q1p4/6B1/n3P1P1/PP3P1P/KR6 b - - 0 1","s":["Nc2+"],"y":[],"r":1003,"m":"Smothered mate","n":1},{"f":"8/8/4k2r/3R3p/3P4/5P1P/4b1PK/8 w - - 0 1","s":["Re5+","Rxe2"],"y":["Kd6"],"r":1003,"m":"Fork","n":0},{"f":"r2r2k1/2q1bpp1/3p3p/1ppn4/1P1BP3/P5Q1/4RPPP/R5K1 w - - 0 1","s":["Qxg7+"],"y":[],"r":1004,"m":"Mate in 1","n":1},{"f":"1qkr3r/pp1b2p1/5p2/3Pn2p/2PQ1B2/P2B2P1/5P1P/1R3RK1 b - - 0 1","s":["Nf3+","Nxd4","Kxb8"],"y":["Kg2","Bxb8"],"r":1004,"m":"Fork","n":0},{"f":"6QK/8/2k5/3r4/8/8/8/8 b - - 0 1","s":["Rh5+","Rxh7+"],"y":["Qh7"],"r":1005,"m":"Winning tactic","n":0},{"f":"6k1/1p4bp/p1n3p1/5p2/4p3/Pr2P1NP/4B1P1/2R3K1 w - - 0 1","s":["Bc4+","Bxb3"],"y":["Kh8"],"r":1005,"m":"Fork","n":0},{"f":"6k1/5pp1/7p/2N5/2R1N1K1/5nP1/5P1P/6r1 b - - 0 1","s":["Ne5+","Nxc4"],"y":["Kf4"],"r":1006,"m":"Fork","n":0},{"f":"4r1k1/1p3pp1/2pqr2p/1P6/3P4/2R2Q1P/5PP1/2R3K1 b - - 0 1","s":["Re1+","Rxe1+"],"y":["Rxe1"],"r":1006,"m":"Mate in 2","n":2},{"f":"3rr1k1/p4pp1/1p1q3p/2pnR3/8/5N1P/PP2QPP1/4R1K1 w - - 0 1","s":["Rxe8+","Qxe8+"],"y":["Rxe8"],"r":1007,"m":"Kingside attack","n":0},{"f":"4r1k1/pp2qppp/2p5/3N3P/3b2n1/1P2P3/1P1K2P1/R3R3 w - - 0 1","s":["Nxe7+","exd4"],"y":["Rxe7"],"r":1007,"m":"Kingside attack","n":0},{"f":"3r2k1/5ppp/p3p3/1q2P3/8/2P1bQPP/8/5R1K w - - 0 1","s":["Qxf7+","Qf8+","Rxf8+"],"y":["Kh8","Rxf8"],"r":1008,"m":"Back-rank mate","n":3},{"f":"7k/6p1/1p5b/p4B1Q/1P3q1p/7P/5PP1/7K w - a6 0 1","s":["Qe8+"],"y":[],"r":1008,"m":"Mate in 1","n":1},{"f":"3r4/R3bp2/4p1k1/4P1p1/1Pp1NnP1/5K2/2R2P2/8 b - - 0 1","s":["Rd3+"],"y":[],"r":1009,"m":"Mate in 1","n":1},{"f":"r5k1/6pp/2p1p3/1p1pq3/4b3/1BP1P1P1/2P2Q1P/5RK1 w - - 0 1","s":["Qf7+","Qf8+","Rxf8+"],"y":["Kh8","Rxf8"],"r":1009,"m":"Back-rank mate","n":3},{"f":"7r/1p1k4/p3p2p/3pPn2/5R2/1P5P/PB5K/8 w - - 0 1","s":["Rxf5","e6+","Bxh8"],"y":["exf5","Kxe6"],"r":1010,"m":"Discovered attack","n":0},{"f":"r4rk1/pp2ppbp/5np1/n1pq2N1/4N3/3P1Q2/PPP2PPP/R1B2RK1 w - - 0 1","s":["Nxf6+","Qxd5"],"y":["exf6"],"r":1011,"m":"Discovered attack","n":0},{"f":"3r1rk1/pp4b1/2p2p2/5P1p/6n1/2N2B2/PPP1Q1Pq/3RRK2 b - - 0 1","s":["Qh1+"],"y":[],"r":1012,"m":"Mate in 1","n":1},{"f":"2k2r2/pp5p/3p4/3Nb1p1/8/1P1P3P/P1PR4/1K3R2 b - - 0 1","s":["Rxf1+","Rxd1+"],"y":["Rd1"],"r":1013,"m":"Mate in 2","n":2},{"f":"8/3b4/k6p/p4p2/4pr2/P5r1/1R3P1N/7K w - - 0 1","s":["fxg3","Nxf3"],"y":["Rf3"],"r":1013,"m":"Trapped piece","n":0},{"f":"r2qk2r/pp2bBpp/2n5/4p3/6b1/2P2N2/P4PPP/R1BQ1RK1 b kq - 0 1","s":["Kxf7","Bxg5"],"y":["Ng5+"],"r":1014,"m":"Winning tactic","n":0},{"f":"2b2r1k/pp4p1/2p5/4r3/2B5/1P6/P4pK1/5R2 w - - 0 1","s":["Rh1+","Rxh3+","Rxh5+"],"y":["Bh3+","Rh5"],"r":1017,"m":"Mate in 3","n":3},{"f":"6k1/pp3rpp/4Nb2/4p3/1r6/6PK/PP5P/2R5 w - - 0 1","s":["Rc8+","Rxd8+","Rxf8+"],"y":["Bd8","Rf8"],"r":1017,"m":"Mate in 3","n":3},{"f":"r2qr1k1/pp3ppp/2p5/3pR2b/2nP4/2N2N1P/PPP1QP2/4R1K1 w - - 0 1","s":["Rxe8+","Qxe8+","Rxe8+"],"y":["Qxe8","Rxe8"],"r":1017,"m":"Back-rank mate","n":3},{"f":"1R6/1P6/4pkp1/5p2/3P4/3KP2p/8/1r6 w - - 0 1","s":["Rf8+","b8=Q","Rxb8"],"y":["Ke7","Rxb8"],"r":1019,"m":"Clearance","n":0},{"f":"r5k1/4rp2/p2b1p2/1ppPq1N1/8/2NQ3P/PP6/5RK1 w - - 0 1","s":["Qh7+","Qh8+"],"y":["Kf8"],"r":1019,"m":"Mate in 2","n":2},{"f":"5k2/5p1p/6p1/1p2q3/2p1p1Q1/1P2P3/P1R2PPP/6K1 b - - 0 1","s":["Qa1+","Qxc1+","Qxd1+"],"y":["Rc1","Qd1"],"r":1020,"m":"Back-rank mate","n":3},{"f":"8/8/3q3k/8/4pQ2/4P2P/5pK1/8 b - - 0 1","s":["Qxf4","e3"],"y":["exf4"],"r":1021,"m":"Winning tactic","n":0},{"f":"r1b1kb1r/pp5p/2pp1q1p/1B1Qp3/4P3/2N5/PPP2PPP/R3K2R w KQkq - 0 1","s":["Bxc6+","Qxc6+"],"y":["bxc6"],"r":1021,"m":"Winning tactic","n":0},{"f":"5rk1/1p1b3p/p2pN2q/2pP4/2P3np/1P4P1/P5B1/4QR1K w - - 0 1","s":["Rxf8+","Nxf8"],"y":["Qxf8"],"r":1021,"m":"Kingside attack","n":0},{"f":"r3k2r/p1p1bpp1/4p3/4P1p1/q3N3/1Rp1P2P/2Q2PP1/4K2R w Kkq - 0 1","s":["Rb8+","Qxa4+"],"y":["Rxb8"],"r":1021,"m":"Discovered attack","n":0},{"f":"1r5k/p1p4p/2p3r1/3pR1n1/5p2/1NP2P2/PP4PP/R1B3K1 b - - 0 1","s":["Nxf3+","Nxe5"],"y":["Kh1"],"r":1021,"m":"Pin","n":0},{"f":"r1b1r3/pp1p1p1k/2n2Bp1/2p1qp2/2B1P3/3P1R2/PPP3PP/R5K1 w - - 0 1","s":["Rh3+","Rh8+"],"y":["Kg8"],"r":1023,"m":"Mate in 2","n":2},{"f":"r1bq1rk1/pp3ppp/n2N4/b2p3n/2pP4/2P2NB1/PP2BPPP/R2Q1RK1 b - - 0 1","s":["Nxg3","Qxd6"],"y":["hxg3"],"r":1024,"m":"Remove the defender","n":0},{"f":"8/2R4p/6pk/5p2/2rP1KPP/4PP2/8/2r5 w - - 0 1","s":["g5+","Rxh7+"],"y":["Kh5"],"r":1024,"m":"Mate in 2","n":2},{"f":"1k5r/ppp1R2p/r4p2/5Q2/3p4/2qP4/2P2PPP/2K1R3 w - - 0 1","s":["Re8+","Rxe8+"],"y":["Rxe8"],"r":1031,"m":"Back-rank mate","n":2},{"f":"r6r/ppk3pp/2pb4/4P3/8/6PQ/PP3PKP/R1Bq4 w - - 0 1","s":["exd6+","Bf4","gxf4"],"y":["Qxd6","Qxf4"],"r":1031,"m":"Pin","n":0},{"f":"rn1q1rk1/ppp2pp1/3p1n1p/2b1p2N/2B1P1b1/3P4/PPP2PPP/RNBQ1RK1 w - - 0 1","s":["Nxf6+","Qxg4"],"y":["Qxf6"],"r":1032,"m":"Kingside attack","n":0},{"f":"3r2k1/5ppp/1Q1B1b2/1p6/2p5/8/1P1q1PPP/4R1K1 w - - 0 1","s":["Qxd8+","Re8+"],"y":["Bxd8"],"r":1035,"m":"Back-rank mate","n":2},{"f":"2k3rr/1pp1nB2/p2qp2p/3p3Q/8/2N1P2P/PPPP2Rb/R1B2K2 b - - 0 1","s":["Rxg2","Qg3+"],"y":["Kxg2"],"r":1036,"m":"Attraction","n":0},{"f":"r2q1rk1/pp1bbpp1/3p1n1p/2pN4/2B1P2B/3Q4/PPP2PPP/R4RK1 b - - 0 1","s":["Nxd5","Bxh4"],"y":["Bxd5"],"r":1040,"m":"Discovered attack","n":0},{"f":"3r2k1/p6p/1p4p1/3q1p2/8/3Q2PP/P4P2/4R1K1 w - - 0 1","s":["Re8+","Qxd5+"],"y":["Rxe8"],"r":1040,"m":"Deflection","n":0},{"f":"r2r3k/p1p2ppp/2Qb2q1/2p5/2P1p3/1P2P2P/PB3PP1/R2R2K1 b - - 0 1","s":["Bh2+","Qxc6"],"y":["Kxh2"],"r":1041,"m":"Discovered attack","n":0},{"f":"3r2k1/2p2pp1/1p5p/3P4/3Q4/3B2P1/3q1PKP/8 w - - 0 1","s":["Bh7+","Qxd2"],"y":["Kxh7"],"r":1042,"m":"Discovered attack","n":0},{"f":"1nr2rk1/pbb1qp1p/1p2p1p1/8/1P1PN3/P2BP2R/2Q1N1PP/5RK1 w - - 0 1","s":["Nf6+","Rxf6"],"y":["Qxf6"],"r":1048,"m":"Kingside attack","n":0},{"f":"8/8/5k2/6p1/3rK1P1/5P2/8/8 w - - 0 1","s":["Kxd4","Ke4"],"y":["Ke6"],"r":1048,"m":"Zugzwang","n":0},{"f":"2kr4/1bp1n1pp/pp4q1/3Pn3/4PP2/2NB4/PP1Q2PP/2R1R1K1 b - f3 0 1","s":["Nf3+","Nxd2"],"y":["Kh1"],"r":1049,"m":"Pin","n":0},{"f":"5k2/2p2p2/1p6/1P3Q2/3Np1n1/2P1P1P1/3q1PK1/8 b - - 0 1","s":["Nxe3+","Nxf5"],"y":["Kh3"],"r":1049,"m":"Pin","n":0},{"f":"4r2k/4P1p1/1p1p3p/p3pQ2/P3n3/7P/1P3PPK/2r5 w - - 0 1","s":["Qf8+","exf8=Q+"],"y":["Rxf8"],"r":1057,"m":"Promotion","n":0},{"f":"4rrk1/1p4pp/p4q2/3pRp2/Q2PnP2/6P1/PP3P2/4R1K1 w - - 0 1","s":["Rxe8","Rxf8+"],"y":["b5"],"r":1061,"m":"Kingside attack","n":0},{"f":"8/8/1p6/3k1p2/pP2pP1p/P3P2P/1K4P1/8 b - - 0 1","s":["Kc4","b5","Kb3"],"y":["Kc2","Kd2"],"r":1063,"m":"Zugzwang","n":0},{"f":"3Q4/5p2/5Pk1/4K2p/P2P4/2q1p3/5r2/8 w - - 0 1","s":["Qg8+","Qg7+"],"y":["Kh6"],"r":1100,"m":"Mate in 2","n":2},{"f":"r5k1/P4pp1/4p2p/3p4/4n3/2q3P1/2P1QP1P/1R5K w - - 0 1","s":["Rb8+","axb8=Q+"],"y":["Rxb8"],"r":1100,"m":"Promotion","n":0},{"f":"4rr1k/pppQ4/1b1p4/3R4/4P3/6q1/PP3PP1/5RK1 w - - 0 1","s":["Rh5+","Qh7+"],"y":["Kg8"],"r":1100,"m":"Mate in 2","n":2},{"f":"r1b1k2r/1p3p2/p1pqp3/2b2Ppp/4P1n1/2NB1Q1P/PPP3P1/R3BR1K b kq - 0 1","s":["Qh2+"],"y":[],"r":1101,"m":"Mate in 1","n":1},{"f":"5b1r/1Q3p2/p3pk1p/1p1p2p1/3q4/1P3PPP/P3K1P1/2R2B1R b - - 0 1","s":["Qb2+","Qxc1"],"y":["Kd3"],"r":1101,"m":"Fork","n":0},{"f":"5r1k/pr4p1/2p2P1p/3nP3/6R1/1P6/P1Pb2PP/5R1K w - - 0 1","s":["fxg7+","Rxf8+"],"y":["Rxg7"],"r":1101,"m":"Fork","n":0},{"f":"1r1qkb1r/pQpbpppp/2n2n2/1N6/2pP4/8/PP2PPPP/R1B1KBNR w KQk - 0 1","s":["Nxc7+","Qxc7"],"y":["Qxc7"],"r":1102,"m":"Winning tactic","n":0},{"f":"2k2r2/1pq2p1r/p1p1p3/2NpP2p/3P1RpP/6P1/PPPQ2P1/2K5 w - - 0 1","s":["Nxe6","Rxf8+"],"y":["fxe6"],"r":1103,"m":"Winning tactic","n":0},{"f":"6k1/r1b1q3/2p3p1/2Pp4/1P2p1n1/2B1P3/NQ6/2K4R w - - 0 1","s":["Rh8+","Rh7+","Rxe7+"],"y":["Kf7","Ke8"],"r":1104,"m":"Skewer","n":0},{"f":"8/1p6/1P5p/P1k5/5p2/8/6KP/8 b - - 0 1","s":["Kb5","Kxa5","Kxb6"],"y":["Kf3","Kxf4"],"r":1104,"m":"Winning tactic","n":0},{"f":"r2qk2r/1p5p/p2b1p2/3Q4/3Bn3/P3P2P/2P2PP1/RN2K1NR b KQkq - 0 1","s":["Bb4+","Qxd5"],"y":["axb4"],"r":1106,"m":"Discovered attack","n":0},{"f":"4k3/5r2/p7/1p3p1P/3Q1PPB/P1n4K/1b1p4/3q4 w - - 0 1","s":["Qd8+"],"y":[],"r":1106,"m":"Mate in 1","n":1},{"f":"8/R1R2ppk/3qp1bp/pB6/P7/4P1QP/6PK/3r4 b - - 0 1","s":["Rh1+","Qxg3"],"y":["Kxh1"],"r":1106,"m":"Deflection","n":0},{"f":"1q4k1/5pp1/R3p2p/p1r5/P3Q3/6PP/5P1K/8 w - - 0 1","s":["Ra8","Qxa8+"],"y":["Qxa8"],"r":1106,"m":"Pin","n":0},{"f":"6rk/pp2p2p/1n1p1nq1/2pP1R2/3bN3/3Q4/PPPB2PP/5R1K b - - 0 1","s":["Qxg2+"],"y":[],"r":1106,"m":"Mate in 1","n":1},{"f":"r1b2rk1/pp1pqpbp/6p1/3nP3/2B2P2/P5Q1/1PP3PP/RNB2RK1 b - - 0 1","s":["Qc5+","Qxc4"],"y":["Qf2"],"r":1106,"m":"Fork","n":0},{"f":"8/4bp2/p3k3/4Ppp1/1PPR1P2/8/3Q1KP1/rq6 w - - 0 1","s":["Rd6+","Qxd6+"],"y":["Bxd6"],"r":1106,"m":"Mate in 2","n":2},{"f":"r2qr1nk/1p4p1/p1pb3N/8/3P3B/3B4/PP3PPP/R5K1 w - - 0 1","s":["Nf7+"],"y":[],"r":1106,"m":"Mate in 1","n":1},{"f":"3r4/p4ppk/2q4p/2NpPb2/1PPQ4/5P2/P6P/3R3K b - - 0 1","s":["dxc4","Qxf3+"],"y":["Qxd8"],"r":1108,"m":"Pin","n":0},{"f":"4r2r/p1pk1p2/Q2b2qp/2P3p1/P1P1p3/8/1P1B1PPP/R3R1K1 b - - 0 1","s":["Bxh2+","Qxa6"],"y":["Kxh2"],"r":1108,"m":"Discovered attack","n":0},{"f":"6k1/8/5PK1/4R3/5P1P/1p6/8/1r6 b - - 0 1","s":["Rg1+","b2"],"y":["Kh6"],"r":1108,"m":"Winning tactic","n":0},{"f":"r2qk2r/ppp3pp/4p3/3pP3/1b2nB2/2NQ3R/PPP1PP2/R3K3 w Qkq - 0 1","s":["Qb5+","Qxb4"],"y":["Qd7"],"r":1109,"m":"Fork","n":0},{"f":"8/5q1k/6pp/4Q3/2pP4/2B1n2P/1P4P1/7K b - - 0 1","s":["Qf1+","Qxg2+"],"y":["Kh2"],"r":1109,"m":"Mate in 2","n":2},{"f":"5KQ1/r7/5k2/8/8/8/8/8 b - - 0 1","s":["Ra8+"],"y":[],"r":1110,"m":"Mate in 1","n":1},{"f":"8/p4k2/1p3P1p/4PR2/3r3B/P2p2P1/1Kb5/8 w - - 0 1","s":["e6+","f7","f8=Q+"],"y":["Kxe6","Kxf5"],"r":1111,"m":"Promotion","n":0},{"f":"3rk2r/p1QNnppp/2p5/4pq2/8/8/PP3PPP/3R2K1 w k - 0 1","s":["Nf6+","Qxd8+"],"y":["gxf6"],"r":1112,"m":"Mate in 2","n":2},{"f":"3r2r1/1b3p1k/p1q2Pp1/1p6/6P1/P2BR3/1PP2R1P/6K1 w - - 0 1","s":["Rh3+"],"y":[],"r":1113,"m":"Mate in 1","n":1},{"f":"3r2k1/1p3p1p/2p3p1/3q1bPP/3r1P2/pP2Q3/P7/K1R1R3 w - - 0 1","s":["Qe8+","Rxe8+","h6+"],"y":["Rxe8","Kg7"],"r":1113,"m":"Mate in 3","n":3},{"f":"1q2k2r/2p2pR1/4p3/p1p5/2p1n3/4PP2/2PP2QP/2K5 w k - 0 1","s":["Rg8+","Rxb8"],"y":["Ke7"],"r":1113,"m":"Skewer","n":0},{"f":"Q7/5qk1/p2p4/b1p1pr2/P7/6P1/4KP1R/8 w - - 0 1","s":["Qh8+","Qh6+"],"y":["Kg6"],"r":1115,"m":"Mate in 2","n":2},{"f":"2k5/1pp2B2/p1np4/4pR2/PP2P1q1/1NPP2P1/5bK1/8 w - - 0 1","s":["Be6+","Rf8+","Bxg4"],"y":["Kd8","Ke7"],"r":1115,"m":"Fork","n":0},{"f":"3rk1nr/pp3ppp/2nq4/1B3b2/3p4/4PN2/PP3PPP/R1BQK2R b KQk - 0 1","s":["Qb4+","Qxb5"],"y":["Qd2"],"r":1115,"m":"Fork","n":0},{"f":"2r1r3/pp2P1k1/2q5/3N3Q/5P2/8/PPP3PP/1K2R3 b - - 0 1","s":["Qxc2+","Qc1+","Rxc1+"],"y":["Ka1","Rxc1"],"r":1116,"m":"Back-rank mate","n":3},{"f":"r1b2r2/pp2bpkp/1qn1p2p/3pP3/3P4/5NN1/PP1QBPPP/R3K2R b KQ - 0 1","s":["Bb4","Bxd2+"],"y":["O-O-O"],"r":1118,"m":"Pin","n":0},{"f":"5r1k/1p3qbp/3Q2p1/2P5/1P6/8/6PP/3R1NK1 b - - 0 1","s":["Qf2+","Qxf1+","Rxf1+"],"y":["Kh1","Rxf1"],"r":1118,"m":"Back-rank mate","n":3},{"f":"rk2Q2r/pp4pp/1qpR4/8/8/2p5/PPP2PPP/4R1K1 b - - 0 1","s":["Rxe8","Kc7"],"y":["Rxe8+"],"r":1119,"m":"Winning tactic","n":0},{"f":"7Q/2p5/1p2prp1/p4k1p/q4p1P/8/6RK/8 w - - 0 1","s":["Rg5+","Qxf6"],"y":["Ke4"],"r":1121,"m":"Deflection","n":0},{"f":"8/r4pp1/2k1p2p/8/pK1PP3/5PP1/6P1/1R6 b - - 0 1","s":["Rb7+","Rxb1"],"y":["Kxa4"],"r":1122,"m":"Skewer","n":0},{"f":"5rk1/1pqbn1p1/pbn5/3pp1PP/3P3N/2PBB3/8/RN3QK1 w - - 0 1","s":["Bh7+","Qxf8"],"y":["Kxh7"],"r":1123,"m":"Deflection","n":0},{"f":"r2q2k1/1pp1rpp1/p1n4p/3pN2n/3P4/2N4P/PPP1RPP1/R2Q2K1 w - - 0 1","s":["Nxc6","Rxe7"],"y":["bxc6"],"r":1123,"m":"Discovered attack","n":0},{"f":"r7/2p3rk/p2p1q1p/Pp1P4/1P2P3/2PQ4/6R1/R5K1 w - - 0 1","s":["e5+","Rxg6"],"y":["Qg6"],"r":1125,"m":"Discovered attack","n":0},{"f":"r2qr1k1/b1p2ppp/p5n1/P1p1p3/4P1n1/B2P2Pb/3NBP1P/RN1QR1K1 w - - 0 1","s":["Bxg4","Qxg4"],"y":["Bxg4"],"r":1126,"m":"Winning tactic","n":0},{"f":"2kr1b1r/3n1pp1/p1p1p1b1/2p4p/3PPB1P/1PP2P2/6P1/R3KB1R w KQ - 0 1","s":["Bxa6+"],"y":[],"r":1126,"m":"Boden mate","n":1},{"f":"6k1/5ppp/r1p5/p1n1rP2/8/2P2N1P/2P3P1/3R2K1 w - - 0 1","s":["Rd8+","Rxe8+"],"y":["Re8"],"r":1128,"m":"Back-rank mate","n":2},{"f":"r5k1/2Q2ppp/8/8/3Pq2n/p3P3/P5PP/5RK1 w - - 0 1","s":["Qxf7+","Qf8+","Rxf8+"],"y":["Kh8","Rxf8"],"r":1130,"m":"Back-rank mate","n":3},{"f":"8/4n1k1/4P3/3p2PP/rp1P4/3K4/P4R2/8 b - - 0 1","s":["Ra3+","Rxa2+","Rxf2"],"y":["Kc2","Kb3"],"r":1130,"m":"Skewer","n":0},{"f":"6k1/5pp1/2p4p/1pP5/qP2P3/1Q3P2/2KR2P1/4r3 b - - 0 1","s":["Rc1+","Qxb3"],"y":["Kxc1"],"r":1131,"m":"Deflection","n":0},{"f":"r2qk2r/1pp2ppp/p1pb1P2/8/3Q4/2N2b2/PPP2PPP/R1B2RK1 b kq - 0 1","s":["Bxh2+","Qxd4"],"y":["Kxh2"],"r":1133,"m":"Discovered attack","n":0},{"f":"5r1k/1Q4bp/4P1p1/p7/3q4/8/5PPP/R1R3K1 b - - 0 1","s":["Qxf2+","Bxa1"],"y":["Kh1"],"r":1133,"m":"Discovered attack","n":0},{"f":"k5r1/pp3R2/4p2p/n2pP2P/2pPn2N/Pq2B1P1/6NK/5R2 w - - 0 1","s":["Rf8+","Rxf8+"],"y":["Rxf8"],"r":1134,"m":"Back-rank mate","n":2},{"f":"4Qb2/6k1/4Bq1p/p1pP4/P7/4n1BP/6PK/8 b - - 0 1","s":["Nf1+","Nxg3"],"y":["Kg1"],"r":1139,"m":"Deflection","n":0},{"f":"4r3/pp5p/4k3/2p1r3/3p4/PP1P4/3KR2P/5R2 w - - 0 1","s":["Rxe5+","Re1+","Rxe8"],"y":["Kxe5","Kd6"],"r":1145,"m":"Skewer","n":0},{"f":"rn1qk2r/ppp2ppp/5b2/3P4/4P3/5Q1P/PPP2PP1/RN2KB1R b KQkq - 0 1","s":["Bxb2","Bxa1"],"y":["Qb3"],"r":1148,"m":"Trapped piece","n":0},{"f":"r2n3k/pbp1N3/1p2p2p/8/4P3/3B2R1/PPP5/1K6 w - - 0 1","s":["Rg8+","e5+","Bxe4+"],"y":["Kh7","Be4"],"r":1148,"m":"Mate in 3","n":3},{"f":"6k1/8/2P3rp/1p1pp3/1P1N4/2P2Pn1/1P4P1/1K3n2 w - - 0 1","s":["c7","c8=Q+"],"y":["exd4"],"r":1151,"m":"Promotion","n":0},{"f":"r5k1/5ppp/B1Q5/3r1p2/8/1P6/Pq3PPP/6K1 w - - 0 1","s":["Qxa8+","Qxd8+"],"y":["Rd8"],"r":1151,"m":"Back-rank mate","n":2},{"f":"8/1k6/ppP5/1P1p4/3P4/4K3/8/8 b - - 0 1","s":["Kc7","axb5"],"y":["Kd2"],"r":1152,"m":"Defensive move","n":0},{"f":"5rk1/7B/p1p5/3pB1q1/3P2p1/2P2rQb/PP2RPpP/4R1K1 b - - 0 1","s":["Kxh7","Rxg3"],"y":["Bd6"],"r":1154,"m":"Trapped piece","n":0},{"f":"1r5r/p3kp2/4p2p/4P3/R4Pp1/6P1/P1P4P/4K2R b K - 0 1","s":["Rb1+","Rxh1","Kf8"],"y":["Kf2","Rxa7+"],"r":1200,"m":"Skewer","n":0},{"f":"2r5/3k1p2/5Pp1/PPBpP1P1/1K5P/5p2/8/8 b - - 0 1","s":["Rxc5","f2"],"y":["Kxc5"],"r":1200,"m":"Sacrifice","n":0},{"f":"8/bp5p/4k1p1/pN6/1pP1KP1P/r5P1/P1R5/8 b - - 0 1","s":["Re3+"],"y":[],"r":1200,"m":"Mate in 1","n":1},{"f":"r4rk1/ppb2ppp/2p2q2/3npb2/2N5/1BP2Q2/PP1P2PP/R1B2RK1 w - - 0 1","s":["Qxf5","Rxf5"],"y":["Qxf5"],"r":1200,"m":"Winning tactic","n":0},{"f":"r7/3r1kp1/8/4B2R/2R5/p6P/5PP1/2n2K2 b - - 0 1","s":["Rd1+"],"y":[],"r":1201,"m":"Mate in 1","n":1},{"f":"r1b1qbkr/pp2p1p1/1nnpP2p/6N1/3P4/5Q2/PP3PPP/RNB1K2R w KQ - 0 1","s":["Qf7+","exf7+"],"y":["Qxf7"],"r":1201,"m":"Mate in 2","n":2},{"f":"8/6bk/7p/1p1Q4/p1pP1q2/P1P1p1N1/1P4PP/6K1 b - - 0 1","s":["Qf2+","Qe1+","Qxf1+"],"y":["Kh1","Nf1"],"r":1202,"m":"Mate in 3","n":3},{"f":"7k/2b3p1/q6p/p2Q4/Pp3pP1/1B5P/1P6/6K1 w - - 0 1","s":["Qg8+"],"y":[],"r":1202,"m":"Mate in 1","n":1},{"f":"r1bq1rk1/pp3pbp/3p2p1/2pBnPB1/4P3/5N2/PPP3PP/R2Q1RK1 b - - 0 1","s":["Nxf3+","Qxg5"],"y":["Rxf3"],"r":1202,"m":"Kingside attack","n":0},{"f":"4r1k1/p6p/2Q2pp1/5b2/1P6/2P5/P2rqPPP/R1KR4 w - - 0 1","s":["Rxd2","Rd1"],"y":["Qe1+"],"r":1203,"m":"Winning tactic","n":0},{"f":"7Q/1p2R3/5np1/3p1rk1/P2Nn3/8/1PP3b1/2K5 b - - 0 1","s":["Rf1+"],"y":[],"r":1203,"m":"Mate in 1","n":1},{"f":"r1b1k1nr/pp1ppp1p/6pb/4P3/1qBP4/5Q2/PP1N1PPP/R1B1K2R b KQkq - 0 1","s":["Bxd2+","Qxc4"],"y":["Bxd2"],"r":1203,"m":"Winning tactic","n":0},{"f":"3rk2r/pQ3pp1/4p3/4P2p/q2n3P/P3B3/5PP1/R4RK1 b k - 0 1","s":["Ne2+","Qxh4+"],"y":["Kh1"],"r":1204,"m":"Mate in 2","n":2},{"f":"8/p5R1/7p/1p2Bp1k/2q2P2/7P/P5PK/8 w - - 0 1","s":["g4+","hxg4+","Bf6+"],"y":["fxg4","Kh4"],"r":1204,"m":"Mate in 3","n":3},{"f":"2q2rk1/3b2b1/p2p1np1/2pPp1Bp/2P1P3/2N3QP/1r2B1P1/R4RK1 w - - 0 1","s":["Bxf6"],"y":[],"r":1204,"m":"Winning tactic","n":0},{"f":"2k5/pp3b2/2p1N1p1/2P2p2/3K4/P4r2/8/R7 w - - 0 1","s":["Ng5","Nxf3"],"y":["Bd5"],"r":1205,"m":"Fork","n":0},{"f":"8/4k3/8/7R/6K1/5p2/P3n1P1/8 b - - 0 1","s":["fxg2","g1=Q"],"y":["Kf3"],"r":1205,"m":"Promotion","n":0},{"f":"8/pp2Npk1/6pp/8/4Q2P/2P3q1/PP1r2B1/R4K2 b - - 0 1","s":["Qf2+"],"y":[],"r":1205,"m":"Mate in 1","n":1},{"f":"r1b3k1/pp3rpp/8/3pp1B1/2pn3P/P1qB2Q1/2P2PP1/1R1K3R w - - 0 1","s":["Bxh7+","Qxc3"],"y":["Kxh7"],"r":1205,"m":"Discovered attack","n":0},{"f":"8/8/4k3/K7/4p2p/6pP/P5P1/8 w - - 0 1","s":["Kb4","Kc3"],"y":["Kd5"],"r":1205,"m":"Defensive move","n":0},{"f":"1k5r/pp1r1ppp/4p2n/1Nb2q2/2Pp4/6P1/PP3P1P/R1BQR1K1 w - - 0 1","s":["Bf4+","gxf4"],"y":["Qxf4"],"r":1206,"m":"Winning tactic","n":0},{"f":"r1bqk1nr/1p3ppp/p3p3/4P3/1b1Pp3/2N5/PP4PP/R1BQKB1R w KQkq - 0 1","s":["Qa4+","Qxb4"],"y":["Bd7"],"r":1206,"m":"Fork","n":0},{"f":"6k1/pppq1pp1/3n1B1p/8/4R1b1/3B2Q1/PPP2PPP/6K1 b - - 0 1","s":["Nxe4","Nxf6"],"y":["Qe3"],"r":1207,"m":"Winning tactic","n":0},{"f":"2rr4/5pkp/2R1p1p1/1b6/p3P3/P3Q3/BP3PPP/6K1 b - - 0 1","s":["Rd1+","Rxe1+"],"y":["Qe1"],"r":1208,"m":"Back-rank mate","n":2},{"f":"1b3r1k/p5p1/7p/3Q2p1/5q2/5P2/P6P/4RR1K b - - 0 1","s":["Qxh2+"],"y":[],"r":1209,"m":"Mate in 1","n":1},{"f":"r3k1nr/1pp1bppp/p1n1p1q1/4P2b/P2P4/2NBBN2/1P3PPP/R2Q1RK1 b kq - 0 1","s":["Bxf3","Bxd1","Kxf7"],"y":["Bxg6","Bxf7+"],"r":1209,"m":"Pin","n":0},{"f":"4r1k1/1b1r1pPp/4p3/p5B1/5Q2/1P6/PbR3RP/7K b - - 0 1","s":["Rd1+","Rxf1+"],"y":["Qf1"],"r":1210,"m":"Mate in 2","n":2},{"f":"r1bqk2r/1pp2pp1/3p1n1p/p1b1p3/2BNP3/P1NPB2P/1PP2PP1/R2QK2R b KQkq - 0 1","s":["exd4","dxc3"],"y":["Bd2"],"r":1210,"m":"Fork","n":0},{"f":"2r1q2k/6b1/p5pp/1nQ1Nr2/5P2/2P5/PP4PP/R3R1K1 w - - 0 1","s":["Nxg6+","Qxc8+"],"y":["Qxg6"],"r":1210,"m":"Deflection","n":0},{"f":"r1bq1rk1/pp1nb2p/4ppp1/3pP2Q/2pP4/2P1P3/PPBN2PP/R1B2RK1 w - - 0 1","s":["Bxg6","Qxg6+"],"y":["hxg6"],"r":1212,"m":"Kingside attack","n":0},{"f":"1k5r/n1r3pp/5p2/ppN5/5P2/8/2R3PP/1R4K1 w - - 0 1","s":["Na6+","Nxc7"],"y":["Kb7"],"r":1214,"m":"Fork","n":0},{"f":"2rqk2r/5ppp/1n1pp3/1N4P1/4bP2/P7/1PP2Q1P/2KR3R w k - 0 1","s":["Nxd6+","Rxd6"],"y":["Qxd6"],"r":1214,"m":"Fork","n":0},{"f":"8/8/8/p4p2/2pPkP2/2K5/1P6/8 w - - 0 1","s":["Kxc4","d5","Kc5","d6","Kc6"],"y":["Kxf4","Ke5","f4","Ke6"],"r":1214,"m":"Quiet move","n":0},{"f":"8/8/1p2k1K1/2p1pr2/2P3p1/pP4P1/P2R3P/8 w - - 0 1","s":["Rd6+","Kxf5","Kxe4"],"y":["Kxd6","e4"],"r":1214,"m":"Deflection","n":0},{"f":"1rb1qrk1/pp2bppp/4p3/8/2B5/1QP5/PP3PPP/3RK1NR w K - 0 1","s":["Bb5","Rxd8"],"y":["Qd8"],"r":1214,"m":"Trapped piece","n":0},{"f":"1rb2rk1/4bppp/p1n1p3/1pq1P3/7N/P5P1/1PQ2PBP/R1B2RK1 w - - 0 1","s":["Qxc5","Bxc6"],"y":["Bxc5"],"r":1215,"m":"Remove the defender","n":0},{"f":"7r/ppp1k1p1/7p/4N3/8/2P4b/P1P2P1P/2KR4 w - - 0 1","s":["Ng6+","Nxh8"],"y":["Kf6"],"r":1215,"m":"Fork","n":0},{"f":"8/8/5K1p/5P1P/4pkP1/8/8/8 b - - 0 1","s":["e3","e2","e1=Q"],"y":["Kg7","f6"],"r":1216,"m":"Promotion","n":0},{"f":"5rk1/p4ppp/1p6/4p3/3PQP2/2PKP2q/r7/2R1R3 w - - 0 1","s":["Rh1","Rxh2","Rh1","Qxh1"],"y":["Rh2","Qxh2","Qxh1"],"r":1217,"m":"Clearance","n":0},{"f":"2q2r2/1pp2rpk/p1np1n1p/3bp3/4P2N/P2QP1PP/1PP3BK/3R1R2 w - - 0 1","s":["exd5+","Bxe4+"],"y":["e4"],"r":1218,"m":"Discovered attack","n":0},{"f":"8/7R/5p1p/6p1/4k3/6P1/6K1/4r3 w - - 0 1","s":["Re7+","Rxe1"],"y":["Kd5"],"r":1218,"m":"Skewer","n":0},{"f":"6k1/2N2ppp/5n2/Q3p3/4Pn2/5P1P/2q3PK/8 w - - 0 1","s":["Qa8+","Qxe8+"],"y":["Ne8"],"r":1221,"m":"Mate in 2","n":2},{"f":"r1b2rk1/pp3pn1/6pp/4p3/3nN1P1/3P3Q/Pq2PPBP/4RK1R w - - 0 1","s":["Nf6+","Qxh6+"],"y":["Kh8"],"r":1221,"m":"Mate in 2","n":2},{"f":"r2qk1nr/p2b2pp/2pbpp2/2ppN3/5P2/1P2P2P/PBPP2P1/RN1QK2R w KQkq - 0 1","s":["Qh5+","Nxg6","Qxh8"],"y":["g6","hxg6"],"r":1222,"m":"Pin","n":0},{"f":"r1b1rqk1/pp3p1p/2n1p1pQ/3p3N/3P4/2PB4/P4PPP/R4RK1 w - - 0 1","s":["Nf6+","Qxh7+"],"y":["Kh8"],"r":1223,"m":"Mate in 2","n":2},{"f":"1r3rk1/1p4p1/p2bpnpp/2p1p3/q3P1P1/3PB2P/B3QK2/RR6 w - - 0 1","s":["Bxe6+","Rxa4"],"y":["Kh7"],"r":1223,"m":"Discovered attack","n":0},{"f":"rnb1kbnr/pp1pq1pp/2p2p2/4N2Q/3PP3/8/PPP2PPP/RNB1KB1R b KQkq - 0 1","s":["g6","fxe5"],"y":["Qh4"],"r":1226,"m":"Defensive move","n":0},{"f":"6k1/8/2r1RK1p/8/5P1N/3p4/P5P1/8 b - - 0 1","s":["Rxe6+","d2","d1=Q"],"y":["Kxe6","Nf5"],"r":1226,"m":"Promotion","n":0},{"f":"rb4k1/2q3pp/P3pp2/3p4/1Q1P4/3NP3/2P2PPP/R5K1 b - - 0 1","s":["Qxh2+","Qh1+","Qxa1"],"y":["Kf1","Ke2"],"r":1227,"m":"Skewer","n":0},{"f":"5r1k/p1p3p1/7p/4p1N1/2P2q2/1P5Q/P5PP/3R2K1 b - - 0 1","s":["Qf2+","Qf1+","Rxf1+"],"y":["Kh1","Rxf1"],"r":1230,"m":"Back-rank mate","n":3},{"f":"8/R4pkp/1p1R4/8/4PP1K/2r3rP/P7/8 b - - 0 1","s":["Rxh3+","Rcg3+","Rh5+"],"y":["Kg5","Kf5"],"r":1230,"m":"Mate in 3","n":3},{"f":"r1b4r/1p1p1p2/p1n1kbpp/4pN2/2P1P3/5N2/PP3PPP/2KR1B1R w - - 0 1","s":["Rd6+"],"y":[],"r":1230,"m":"Hook mate","n":1},{"f":"1r3r2/3k1p2/p3p1pp/q1ppP3/6Q1/P3R3/1PP2PPP/2KR4 w - - 0 1","s":["Rxd5+"],"y":[],"r":1231,"m":"Pin","n":0},{"f":"6k1/1p3p2/p1p5/4P2Q/1P3P1P/P4K2/8/6q1 b - - 0 1","s":["Qd1+","Qxh5"],"y":["Kg2"],"r":1234,"m":"Skewer","n":0},{"f":"r3k2r/ppp1qppp/3p4/2b1p3/2PnP1b1/3P1N2/PP2BPPP/R1BQK2R w KQkq - 0 1","s":["Nxd4","Bxg4"],"y":["Bxd4"],"r":1235,"m":"Discovered attack","n":0},{"f":"2b5/8/6p1/1R6/3kP3/5PPn/4K3/8 b - - 0 1","s":["Ba6","Bxb5"],"y":["Kd2"],"r":1236,"m":"Pin","n":0},{"f":"2r2nk1/p5pp/bp2p3/3pP1q1/3P4/1P3QP1/P2N2B1/5RK1 w - - 0 1","s":["Qf7+","Qxf8+","Rxf8+"],"y":["Kh8","Rxf8"],"r":1236,"m":"Back-rank mate","n":3},{"f":"3rq1k1/5ppp/3b1p2/1p1Q4/3P4/P6P/1PPB1PP1/2K1R3 b - - 0 1","s":["Qxe1+","Bf4+","Rxd5"],"y":["Bxe1","Kd1"],"r":1236,"m":"Discovered attack","n":0},{"f":"r2q1rk1/pbp2ppp/1p1bpn2/3pn3/3P4/2P1P1B1/PP1NBPPP/R2QK2R w KQ - 0 1","s":["dxe5","exf6"],"y":["Be7"],"r":1300,"m":"Fork","n":0},{"f":"r1q1r1k1/1p3pp1/n1p4p/p2pp2P/P3P3/2P2P2/1P1QBb2/R1BK3R w - - 0 1","s":["Bxa6","Qxf2"],"y":["bxa6"],"r":1301,"m":"Discovered attack","n":0},{"f":"4r1r1/pp1knp1p/5p2/2pN3q/2P3bN/1P4P1/P2P1P1P/R3Q1K1 w - - 0 1","s":["Nxf6+","Nxh5"],"y":["Kd8"],"r":1302,"m":"Fork","n":0},{"f":"r1bqk1nr/ppp3pp/2nb4/3Qp3/8/P3P1B1/1PP2PPP/RN2KBNR b KQkq - 0 1","s":["Bb4+","Bxd2+"],"y":["Qd2"],"r":1302,"m":"Winning tactic","n":0},{"f":"3r1rk1/1p2q1pp/5p2/8/1P1n4/6Q1/PPBB1PPP/R4RK1 b - - 0 1","s":["Ne2+","Nxg3+","Rxd2"],"y":["Kh1","fxg3"],"r":1303,"m":"Fork","n":0},{"f":"8/8/6p1/3nkp1p/7P/1B2KPP1/8/8 w - - 0 1","s":["Bxd5","Kf4"],"y":["Kxd5"],"r":1303,"m":"Winning tactic","n":0},{"f":"1r4k1/3b1p1p/3pp1p1/Ppq5/1N6/1Pr1PP2/4QP1P/1R3R1K w - - 0 1","s":["Na6","Nxb8"],"y":["Qc8"],"r":1303,"m":"Fork","n":0},{"f":"8/pp4Q1/3R3p/7k/2P4n/4P2P/5qPK/8 b - - 0 1","s":["Nf3+","Qe1+"],"y":["Kh1"],"r":1304,"m":"Mate in 2","n":2},{"f":"5r1r/7k/p2p2p1/1p1P3p/2p1NRnP/P5P1/1PP3K1/5R2 b - - 0 1","s":["Ne3+","Nxf1"],"y":["Kg1"],"r":1304,"m":"Fork","n":0},{"f":"r2q1rk1/4b1pp/p1np4/1pP1p3/4P1b1/2P2NP1/PPQ2PB1/2BRR1K1 b - - 0 1","s":["Bxf3","Rxf3"],"y":["Bxf3"],"r":1305,"m":"Winning tactic","n":0},{"f":"r1b2rk1/pppp1ppp/5q1n/2b1n1N1/2Bp4/3Q4/PPP2PPP/RNB2RK1 w - - 0 1","s":["Qxh7+"],"y":[],"r":1306,"m":"Mate in 1","n":1},{"f":"Q7/6pk/7p/6PP/8/1q6/p4PK1/8 w - - 0 1","s":["g6+"],"y":[],"r":1306,"m":"Mate in 1","n":1},{"f":"2k2br1/1pp2Npp/p3pn2/8/8/6P1/PPP1KP1P/3R4 w - - 0 1","s":["Rd8+"],"y":[],"r":1308,"m":"Mate in 1","n":1},{"f":"r5rk/1bq2pp1/p6p/2p2BQ1/1p2np2/3p3R/PPP3PP/R5K1 w - - 0 1","s":["Rxh6+","Qxh6+"],"y":["gxh6"],"r":1308,"m":"Mate in 2","n":2},{"f":"rnbqkb1r/pp3p1p/6pn/P1ppp3/8/3P1P2/1PP1P1P1/RNBQKBNR w KQkq - 0 1","s":["Bxh6","Rxh6"],"y":["Bxh6"],"r":1309,"m":"Winning tactic","n":0},{"f":"1r4r1/p1kq1p2/3p4/p2bp2p/2P3np/P1QPP1P1/5P2/1R2R1K1 w - - 0 1","s":["cxd5+","Rxb8+"],"y":["Kd8"],"r":1309,"m":"Discovered attack","n":0},{"f":"8/8/2p5/P7/1k6/3K1p2/8/8 w - - 0 1","s":["a6","Ke2","a7"],"y":["f2","Kc5"],"r":1309,"m":"Winning tactic","n":0},{"f":"1k5b/pp2n1q1/n1pN4/4Pb2/5B2/1BN2Q2/PPP3P1/3K4 b - - 0 1","s":["Bg4","Bxf3"],"y":["Kc1"],"r":1309,"m":"Pin","n":0},{"f":"2r5/1p6/p2p3R/3qpkP1/4np2/3B4/PP6/1K4R1 w - - 0 1","s":["Rf6+"],"y":[],"r":1310,"m":"Mate in 1","n":1},{"f":"r2q1rk1/pppb1ppp/1b3n2/4B3/2Q5/2N5/PPP3PP/2KR1B1R w - - 0 1","s":["Bxf6","Rxd7"],"y":["Qxf6"],"r":1310,"m":"Remove the defender","n":0},{"f":"r2q3r/pb2nkpp/1pn5/1N1pQ1P1/3P3P/3p1P2/PPP5/R3K1NR w KQ - 0 1","s":["Nd6+","Qxd6"],"y":["Qxd6"],"r":1311,"m":"Fork","n":0},{"f":"6k1/R7/6K1/7P/8/8/6p1/7r w - - 0 1","s":["Ra8+"],"y":[],"r":1312,"m":"Mate in 1","n":1},{"f":"4r3/5p2/1Q6/3pk3/7K/P5PN/7q/8 w - - 0 1","s":["Qe3+","Qxe8"],"y":["Kd6"],"r":1313,"m":"Skewer","n":0},{"f":"r1b2rk1/ppp2ppp/8/1B1p4/3bn3/5N2/PPP2qPP/RNBQR2K b - - 0 1","s":["Qg1+","Nf2+"],"y":["Nxg1"],"r":1314,"m":"Smothered mate","n":2},{"f":"3rk2r/pp2bppp/2pQ4/2Bn4/6P1/3P4/PPP4P/1K2R1Nq w k - 0 1","s":["Rxe7+","Qxe7+"],"y":["Nxe7"],"r":1314,"m":"Mate in 2","n":2},{"f":"1r1q1rk1/1pp2ppp/p3p3/n2n4/3P4/2P4P/P1PBBPP1/1R1Q1RK1 w - - 0 1","s":["c4","Bxc4"],"y":["Nxc4"],"r":1314,"m":"Winning tactic","n":0},{"f":"4r2r/pppk2pp/3pNn2/1N5b/3P4/8/PP3PPP/2R1R1K1 w - - 0 1","s":["Rxc7+"],"y":[],"r":1314,"m":"Mate in 1","n":1},{"f":"8/p5k1/6r1/1q1pp2R/4P3/4QK2/5P2/8 w - - 0 1","s":["Qxa7+","Rf5+","Qf7+"],"y":["Kf6","Ke6"],"r":1315,"m":"Exposed king","n":0},{"f":"6k1/p4p2/7p/5PP1/3pBK2/1b6/p2r3P/2R5 w - - 0 1","s":["Rc8+","f6+"],"y":["Kg7"],"r":1315,"m":"Mate in 2","n":2},{"f":"8/8/8/7p/p1b4k/P6P/2p3P1/2B3K1 w - - 0 1","s":["Kh2","g3+"],"y":["Bf1"],"r":1321,"m":"Mate in 2","n":2},{"f":"2q5/R5pk/p4p2/1p2pb1p/1P6/P6P/2r2PP1/3Q2K1 w - - 0 1","s":["Qxh5+","Qf7+","Qxg7+"],"y":["Kg8","Kh8"],"r":1323,"m":"Mate in 3","n":3},{"f":"2Q5/1p3kp1/3p2p1/3Pp3/2N1n3/P7/KQq5/8 b - - 0 1","s":["Nc3+","Qd1+","Qxc1+"],"y":["Ka1","Qc1"],"r":1323,"m":"Mate in 3","n":3},{"f":"4rr1k/p1Qn2pp/3p1q2/8/8/2P5/PP3PPP/RN3RK1 b - - 0 1","s":["Qxf2+","Re1+","Rexf1+"],"y":["Rxf2","Rf1"],"r":1324,"m":"Mate in 3","n":3},{"f":"r1b1k1nr/1pq2pbp/p5p1/2pp4/P3NP2/6P1/1PPPQ2P/R1B1K2R w KQkq - 0 1","s":["Nf6+","Qe8+"],"y":["Kf8"],"r":1324,"m":"Mate in 2","n":2},{"f":"3r1k2/pp3pbp/8/4p3/5p2/1BP2P1P/PPR1R1PK/r7 b - - 0 1","s":["Rdd1","Rxe1"],"y":["Re1"],"r":1334,"m":"Quiet move","n":0},{"f":"r1b2rk1/1p2bppp/pqnp4/3Np3/2B1PP2/PN6/1PP2nPP/R1BQ1RK1 b - - 0 1","s":["Nh3+","Qg1+","Nf2+"],"y":["Kh1","Rxg1"],"r":1335,"m":"Smothered mate","n":3},{"f":"8/5pk1/3p2p1/1p6/5P2/6K1/p7/6R1 b - - 0 1","s":["b4","b3"],"y":["Ra1"],"r":1341,"m":"Quiet move","n":0},{"f":"5rk1/Qbq1bppp/2p1pn2/4N3/3P4/3B3P/1BP2PP1/1R4K1 b - - 0 1","s":["Ra8","Bxa8"],"y":["Qxa8+"],"r":1344,"m":"Trapped piece","n":0},{"f":"4k3/R5R1/5K1p/1Pp3r1/8/6P1/4p2P/8 b - - 0 1","s":["Rxg7","e1=Q"],"y":["Kxg7"],"r":1345,"m":"Promotion","n":0},{"f":"r3q1k1/p5b1/1pp3p1/3n1pB1/Qnb1p3/2N1PP1P/PP4BN/3R2K1 w - - 0 1","s":["Nxd5","Qxb4"],"y":["cxd5"],"r":1347,"m":"Remove the defender","n":0},{"f":"6k1/3bnppp/p4n2/1pp5/4N3/1B1P1N2/PPP2PPP/6K1 b - - 0 1","s":["Nxe4","c4","bxc4"],"y":["dxe4","Bxc4"],"r":1348,"m":"Trapped piece","n":0},{"f":"8/2p2p2/3p2kp/p2P4/P1P1KpP1/7P/8/8 w - - 0 1","s":["Kxf4","h4"],"y":["f6"],"r":1348,"m":"Defensive move","n":0},{"f":"8/1R2rp2/4pk2/6p1/4P1P1/8/5K2/8 w - - 0 1","s":["e5+","Rxe7"],"y":["Kxe5"],"r":1348,"m":"Deflection","n":0},{"f":"2r4k/pb4pp/1p6/3pP3/3Pn3/2Pq2NQ/PP5P/5R1K w - - 0 1","s":["Qxc8+","Rf8+"],"y":["Bxc8"],"r":1350,"m":"Back-rank mate","n":2},{"f":"2r2rk1/3Q1ppp/pq2p3/1p2N3/1P3P2/P1P5/5nPP/RNB2RK1 b - - 0 1","s":["Nh3+","Qg1+","Nf2+"],"y":["Kh1","Rxg1"],"r":1351,"m":"Smothered mate","n":3},{"f":"4r3/7k/6pp/2P2b2/1p1Q4/1P3P1P/P7/4rBK1 b - - 0 1","s":["Bxh3","Bxf1"],"y":["Kh2"],"r":1352,"m":"Pin","n":0},{"f":"8/2R5/5p2/4n3/2pp2P1/2k3K1/P4P1P/8 b - - 0 1","s":["d3","d2","d1=Q"],"y":["f4","fxe5"],"r":1354,"m":"Promotion","n":0},{"f":"4k3/p1pp3p/1p3K2/8/5P2/8/8/8 w - - 0 1","s":["Kg7","f5","f6"],"y":["h5","h4"],"r":1355,"m":"Quiet move","n":0},{"f":"4r1k1/1p3pp1/p5r1/2P4p/4P3/P2P1Nq1/5Q2/R3RK2 b - - 0 1","s":["Qh3+","Rg2","Rxf2"],"y":["Ke2","Ke3"],"r":1355,"m":"Pin","n":0},{"f":"r1bq1rkb/pp2pp1p/6pB/3N4/8/5B2/Pn2QPPP/R4RK1 w - - 0 1","s":["Nxe7+","Qxe7"],"y":["Qxe7"],"r":1358,"m":"Kingside attack","n":0},{"f":"2r2r2/1p3ppk/p2p1b2/8/3q4/5R2/P5PP/1R1Q3K w - - 0 1","s":["Rh3+","Qh5","Rxh4","Qxh4"],"y":["Kg8","Qh4","Bxh4"],"r":1359,"m":"Clearance","n":0},{"f":"6R1/P7/8/5k2/5pp1/8/1r3K2/8 w - - 0 1","s":["Ke1","Kd2"],"y":["Rb1+"],"r":1360,"m":"Defensive move","n":0},{"f":"3r2k1/1q3ppp/p3p3/Qp1r4/7P/P4P2/1PP3P1/1K1R3R w - - 0 1","s":["Qxd8+","Rxd8+"],"y":["Rxd8"],"r":1361,"m":"Back-rank mate","n":2},{"f":"8/8/1r4p1/3k1p1p/3P3P/1RK3P1/5P2/8 b - - 0 1","s":["Rxb3+","Kxd4","Ke4"],"y":["Kxb3","Kc2"],"r":1361,"m":"Defensive move","n":0},{"f":"r1bq2k1/pp1nbr1p/2p1pn1p/2Pp1pN1/3P4/2N4P/PPQ1PP2/R3KBR1 w Q - 0 1","s":["Nxe6+","Nxd8"],"y":["Kh8"],"r":1362,"m":"Discovered attack","n":0},{"f":"r6k/p4npp/1p3qn1/2pP4/4QP2/1P6/P4P1P/R3R1K1 w - - 0 1","s":["Qe8+","Qxa8"],"y":["Nf8"],"r":1362,"m":"Pin","n":0},{"f":"r1b2rk1/4b1p1/pq2Nn1p/1p6/3N4/3B2nP/PPP3P1/R1BQR1K1 b - - 0 1","s":["Bxe6","Qxd4+"],"y":["Rxe6"],"r":1363,"m":"Pin","n":0},{"f":"2r2bk1/5ppp/p2p4/3P2PP/P1nQ1B2/1q1R4/1P6/1K2R3 b - - 0 1","s":["Na3+","Nc2+"],"y":["Ka1"],"r":1364,"m":"Pin","n":0},{"f":"3r4/5k1p/2p1p3/1p3p2/3r3P/1P2KN2/2P2PP1/2R4R b - - 0 1","s":["Re4+"],"y":[],"r":1400,"m":"Mate in 1","n":1},{"f":"6r1/2p2p1k/1p2nr1p/pPb1p2Q/P1P1P3/3P2PP/R4PK1/6R1 b - - 0 1","s":["Nf4+","Nxh5"],"y":["Kh2"],"r":1401,"m":"Pin","n":0},{"f":"2k4r/1b4p1/p6p/2b1Np2/3Q4/P4P2/1PP3PP/R4RK1 b - - 0 1","s":["Bxd4+","Bxe5"],"y":["Kh1"],"r":1401,"m":"Fork","n":0},{"f":"r1b3k1/5rpp/p1n1Np2/1p1n4/2pPBq2/2P2N2/PP3PPP/R2QR1K1 b - - 0 1","s":["Bxe6","Kxh7"],"y":["Bxh7+"],"r":1401,"m":"Winning tactic","n":0},{"f":"5k2/3R2pp/4pp2/8/2p5/1p2N1P1/1P3PKP/2r5 b - - 0 1","s":["c3","b2"],"y":["bxc3"],"r":1402,"m":"Winning tactic","n":0},{"f":"2kr3r/1pp5/p1p2Q2/2b2p1P/q1P5/6BP/PP3P2/1K1RR3 b - - 0 1","s":["Rxd1+","Qxd1+"],"y":["Rxd1"],"r":1403,"m":"Mate in 2","n":2},{"f":"1r5N/1p2R1bp/p2k4/2pN3B/2Pn1P2/8/b5PP/6K1 w - - 0 1","s":["Nf7+","Rc7+"],"y":["Kc6"],"r":1403,"m":"Hook mate","n":2},{"f":"r4r2/p3Rp1k/1pp1bqpp/3p1p2/3P4/1NQ5/PPP2PPP/4R1K1 w - - 0 1","s":["R1xe6","Rxe6"],"y":["Qxe6"],"r":1403,"m":"Pin","n":0},{"f":"r3r1k1/ppp3pp/8/3qBRQ1/3P4/8/P1P3PP/R5K1 b - - 0 1","s":["Rxe5","Qd4+","Qxa1+"],"y":["dxe5","Rf2"],"r":1404,"m":"Fork","n":0},{"f":"6B1/p2R4/5p1p/2r3k1/4b3/6P1/P5PK/8 w - - 0 1","s":["Rg7+","Bh7+","Bxe4"],"y":["Kf5","Ke6"],"r":1405,"m":"Skewer","n":0},{"f":"8/Q5b1/p3p3/1p1kqpN1/1P6/P7/4nPP1/5K2 w - - 0 1","s":["Qc5+"],"y":[],"r":1406,"m":"Mate in 1","n":1},{"f":"8/2r2p1p/R7/p1r4R/2n1pk2/2P2P2/P4PKP/8 w - - 0 1","s":["Rf6+","Rhxf5+"],"y":["Rf5"],"r":1406,"m":"Mate in 2","n":2},{"f":"3r2k1/ppp1bppp/2n5/8/4P1b1/1P3N1P/PBP1P1P1/2K2B1R b - - 0 1","s":["Bxf3","Bg5+","Rd1+"],"y":["exf3","Kb1"],"r":1407,"m":"Winning tactic","n":0},{"f":"r3r1k1/ppp2ppp/2nbpq2/5b2/3P4/2P1BN2/P1PQBPPP/3R1RK1 w - - 0 1","s":["Bg5","Nh4","Nxg6"],"y":["Qg6","h6"],"r":1407,"m":"Trapped piece","n":0},{"f":"7r/6RP/2p5/7K/2k5/1p6/5P2/8 b - - 0 1","s":["b2","Rxh7+","b1=Q"],"y":["Rb7","Rxh7"],"r":1407,"m":"Deflection","n":0},{"f":"3r2r1/5p1k/p4Pp1/3pPb2/2pP2B1/6R1/2q3PP/3R2K1 w - - 0 1","s":["Rh3+"],"y":[],"r":1407,"m":"Mate in 1","n":1},{"f":"6k1/6p1/4Pq1p/2p2P2/2PpQ1P1/1P6/r1B4P/7K w - - 0 1","s":["e7","Qxe7"],"y":["Qxe7"],"r":1407,"m":"Winning tactic","n":0},{"f":"3r4/p1pk1p1p/2pp1qr1/2b5/Q3P1bB/5N2/P2N1PPP/R4RK1 b - - 0 1","s":["Bxf3","Qxf3"],"y":["Nxf3"],"r":1408,"m":"Pin","n":0},{"f":"2Q5/1p4pk/p1P4p/8/P5KP/1q4P1/8/8 b - - 0 1","s":["Qxa4+","Qxc6"],"y":["Kh3"],"r":1409,"m":"Winning tactic","n":0},{"f":"r3kb1r/pppq1ppp/4b3/8/Q1n5/4PN2/PP2B1PP/R1B2RK1 w kq - 0 1","s":["Qxd7+","Bxc4"],"y":["Bxd7"],"r":1409,"m":"Winning tactic","n":0},{"f":"8/2r4R/1k1p4/2pB4/Pp2P3/1P2P1r1/6P1/6K1 w - - 0 1","s":["a5+","Rxc7"],"y":["Kxa5"],"r":1409,"m":"Deflection","n":0},{"f":"1r4k1/p5pp/5p2/2Rb4/1P4P1/P7/3r3P/3B1RK1 w - - 0 1","s":["Rxd5","Bb3","Bxd5"],"y":["Rxd5","Kf8"],"r":1410,"m":"Pin","n":0},{"f":"3Qr2k/q5p1/2p1r1Bp/p7/Pp6/5P1P/1P4P1/4R2K w - - 0 1","s":["Qxe8+","Rxe8+"],"y":["Rxe8"],"r":1410,"m":"Mate in 2","n":2},{"f":"2r3k1/pp2npp1/3r3p/5q2/2BBp3/1PP3Rb/P4P2/R2Q3K w - - 0 1","s":["Rxg7+","Rxf7+","Bxf7"],"y":["Kf8","Qxf7"],"r":1410,"m":"Fork","n":0},{"f":"4Q3/6pk/4p2p/3b4/P7/1q5P/6P1/5R1K b - - 0 1","s":["Qxh3+","Qxg2+"],"y":["Kg1"],"r":1412,"m":"Mate in 2","n":2},{"f":"5k2/7q/8/1p3Q2/6P1/8/6K1/8 b - - 0 1","s":["Qxf5","b4","b3","b2"],"y":["gxf5","Kf1","Ke1"],"r":1414,"m":"Quiet move","n":0},{"f":"2r1r1k1/p3qpbp/1p1p1np1/4P3/3B1P2/1P3bP1/PQ1N3P/1R2R1K1 w - - 0 1","s":["exf6","Rxe1","Kf2"],"y":["Qxe1+","Rxe1+"],"r":1415,"m":"Fork","n":0},{"f":"2bk4/5R2/2P5/P3p3/2K2P2/8/2P2r2/8 b - - 0 1","s":["Be6+","Bxf7"],"y":["Kd3"],"r":1415,"m":"Fork","n":0},{"f":"8/5Npk/1R6/5Pp1/rPK5/8/5r2/8 w - - 0 1","s":["Nxg5+","Rb8+"],"y":["Kh8"],"r":1416,"m":"Mate in 2","n":2},{"f":"rn1qk2r/pbppn1b1/1p2p3/4Pp1p/2PP2pB/2N5/PP1N1PPP/R2QKB1R w KQkq f6 0 1","s":["exf6","Bxf6"],"y":["Bxf6"],"r":1417,"m":"Fork","n":0},{"f":"2kr3r/1bpp1ppp/1b4q1/p3Pn2/PpN5/1BPP1P2/3BQ1PP/R4R1K b - - 0 1","s":["Ng3+","Qh5+"],"y":["hxg3"],"r":1418,"m":"Mate in 2","n":2},{"f":"3n2rk/pp4p1/3qp1Qp/6r1/2p3N1/1P5P/PB3PP1/5RK1 w - - 0 1","s":["Qxh6+"],"y":[],"r":1418,"m":"Mate in 1","n":1},{"f":"r4rk1/1pp3pp/p7/4pp2/1PP1N3/P4P1b/5P1P/R2R3K w - f6 0 1","s":["Ng5","fxg4"],"y":["Bg4"],"r":1420,"m":"Trapped piece","n":0},{"f":"r4rk1/p4ppp/b4b2/3q4/8/PN2P2P/R1P1NPP1/3Q1RK1 b - - 0 1","s":["Qxd1","Bxe2"],"y":["Rxd1"],"r":1420,"m":"Remove the defender","n":0},{"f":"4rr1k/2p3pp/p2P4/1p3p2/1P4P1/1BP1q2R/P4QP1/R5K1 b - - 0 1","s":["Qxf2+","fxg4+","gxh3"],"y":["Kxf2","Kg1"],"r":1421,"m":"Discovered attack","n":0},{"f":"r3qr1k/1p2b1p1/4p1Qp/2ppP3/p4P2/2P1P1P1/PP4P1/1K1R3R w - - 0 1","s":["Rxh6+","Qxh6+","Rh1"],"y":["gxh6","Kg8"],"r":1422,"m":"Sacrifice","n":0},{"f":"2r3k1/p6r/3pq1p1/4ppQ1/3p4/1P4P1/P4P1P/2RR2K1 w - - 0 1","s":["Rxc8+","Qxg6+","Qxd6"],"y":["Qxc8","Rg7"],"r":1422,"m":"Exposed king","n":0},{"f":"2rq2k1/5rbp/p5p1/1p2pb2/7P/P1N5/1PQ1NPP1/1K1R3R w - - 0 1","s":["Rxd8+","Ne4","Qxe4"],"y":["Rxd8","Bxe4"],"r":1423,"m":"Quiet move","n":0},{"f":"4r1k1/3Q2pp/p7/1p1pq3/4p3/8/PP4PP/5R1K w - - 0 1","s":["Qf7+","Qf8+","Rxf8+"],"y":["Kh8","Rxf8"],"r":1424,"m":"Back-rank mate","n":3},{"f":"1r6/1p2rppk/p2pp2p/8/4nP2/P1B1P2P/1P3P1K/R5R1 w - - 0 1","s":["Rxg7+","Rxf7+","Rxe7"],"y":["Kh8","Nxc3"],"r":1427,"m":"Discovered attack","n":0},{"f":"5k2/3R4/3P2K1/6P1/1ppr4/8/8/8 w - - 0 1","s":["Rd8+"],"y":[],"r":1430,"m":"Mate in 1","n":1},{"f":"2r3k1/2r3p1/p3pqQ1/1p1p4/nP1P4/2P4R/P4PPP/2R3K1 w - - 0 1","s":["Qh7+","Rf3","gxf3"],"y":["Kf7","Qxf3"],"r":1431,"m":"Pin","n":0},{"f":"8/8/2R5/8/1pk5/7P/P2r4/6K1 b - - 0 1","s":["Kb5","Rxa2"],"y":["Rc8"],"r":1431,"m":"Defensive move","n":0},{"f":"7k/1bq3n1/pp1r2B1/8/2p5/1P2Q2P/P2N2P1/7K w - - 0 1","s":["Qh6+","Qh7+","Qh8+","Qxg7+"],"y":["Kg8","Kf8","Ke7"],"r":1431,"m":"Interference","n":0},{"f":"6rk/3Q2bp/p2p4/5p2/Pq6/2p4P/2P5/K3R1R1 w - - 0 1","s":["Qxg7+","Re8+","Rgxg8+"],"y":["Rxg7","Rg8"],"r":1432,"m":"Mate in 3","n":3},{"f":"8/8/3k2p1/p2n1p2/1pBP1Pp1/1P2K1P1/7P/8 w - - 0 1","s":["Bxd5","Kd3","Kc4","d5+"],"y":["Kxd5","Kd6","Kc6"],"r":1433,"m":"Zugzwang","n":0},{"f":"8/6p1/3p1k1p/3P4/4P1P1/2b4P/2K5/8 w - - 0 1","s":["Kxc3","Kd3"],"y":["Ke5"],"r":1433,"m":"Defensive move","n":0},{"f":"r3k1r1/pp2p3/6b1/3Pp3/N3n2p/8/PPB3PP/1R2R1K1 b q - 0 1","s":["Nd2","Rxg6","Nf3+","Nxe1"],"y":["Bxg6+","Rbc1","Kf2"],"r":1435,"m":"Pin","n":0},{"f":"7k/p5b1/1p2p1B1/2q1P3/3r4/8/P3Q1P1/3R3K b - - 0 1","s":["Rh4+"],"y":[],"r":1438,"m":"Mate in 1","n":1},{"f":"r5k1/6pR/3prPP1/8/1pp1P3/p7/2P5/1K6 w - - 0 1","s":["f7+","Rh8+","Rxa8"],"y":["Kf8","Ke7"],"r":1439,"m":"Skewer","n":0},{"f":"2rr4/5pk1/p1Q1N1pp/1p4q1/3pP3/1B1P4/PPP3PP/6RK b - - 0 1","s":["fxe6","Kh8"],"y":["Qb7+"],"r":1440,"m":"Defensive move","n":0},{"f":"2kr1bnr/ppq1pppp/2n5/3pPb2/3N4/2P4P/PP2QPP1/RNB1KB1R b KQ - 0 1","s":["Nxd4","Qxc1+"],"y":["cxd4"],"r":1440,"m":"Discovered attack","n":0},{"f":"r4rk1/ppp2ppp/3p4/3q4/1P3P1n/3BB1RP/P4P1K/b2Q4 w - - 0 1","s":["Bxh7+","Qxd5"],"y":["Kxh7"],"r":1441,"m":"Discovered attack","n":0},{"f":"r3k2r/1bB2pbp/pp2pn2/8/3qP3/2NB4/PPP3PQ/2KR2N1 w kq - 0 1","s":["Bb5+","Rxd4"],"y":["axb5"],"r":1442,"m":"Discovered attack","n":0},{"f":"5k2/5bp1/7p/p2r4/2KB4/1PP2RP1/P6P/8 b - - 0 1","s":["Rf5+","Rxf3+"],"y":["Kd3"],"r":1442,"m":"Discovered attack","n":0},{"f":"rbb2rk1/1p3ppp/p1n2n2/3p4/3Pp3/P1N1B2P/1qP1BPPN/R2QK2R w KQ - 0 1","s":["Na4","Qxa1"],"y":["Qxa1"],"r":1442,"m":"Trapped piece","n":0},{"f":"6k1/2R2qp1/7p/1pQ1B3/4pP2/8/4rPPP/r1R3K1 b - - 0 1","s":["Re1+","Rxe1+"],"y":["Rxe1"],"r":1445,"m":"Back-rank mate","n":2},{"f":"2r3k1/1p3ppp/p3p3/3pP2Q/2r5/P1Pq3P/1P2R2b/5R1K w - - 0 1","s":["Qxf7+","Qf8+","Rxf8+"],"y":["Kh8","Rxf8"],"r":1450,"m":"Back-rank mate","n":3},{"f":"7r/pppk4/2pN1r2/8/3P2p1/2P5/PP2RPP1/4R1K1 b - - 0 1","s":["Rfh6","g3","Kxd6","Rh1+"],"y":["f4","Re7+","Kf1"],"r":1500,"m":"Winning tactic","n":0},{"f":"r4rk1/1bb2ppp/p1n1p3/4P3/Np1q4/1B2NP2/1P4PP/2RQ1RK1 w - - 0 1","s":["Qxd4","Rxc7","Rxb7"],"y":["Nxd4","Nxb3"],"r":1500,"m":"Winning tactic","n":0},{"f":"3r4/4kp1p/1PQ1p1p1/p3b3/1p2P2P/1P5K/6P1/8 b - - 0 1","s":["Rd3+","Rxg3+","Rc3+"],"y":["g3","Kh2"],"r":1500,"m":"Discovered attack","n":0},{"f":"5r1k/5rp1/p7/1b2B2p/1P1P1Pq1/2R3Q1/P3p1P1/2R3K1 b - - 0 1","s":["Rxf4","Rxf4"],"y":["Bxf4"],"r":1500,"m":"Winning tactic","n":0},{"f":"r2q1r1k/1pp3p1/1b2b2p/3n4/pP6/P1PQ1N1P/1BB2PP1/R3K2R b KQ - 0 1","s":["Bf5","Bxd3"],"y":["O-O-O"],"r":1500,"m":"Winning tactic","n":0},{"f":"2kr4/1pq2p2/p2bp1p1/4n2p/Q1P2B2/7P/P3BPP1/1R4K1 w - - 0 1","s":["c5","Qxc6+"],"y":["Qc6"],"r":1500,"m":"Queenside attack","n":0},{"f":"r2r2k1/p4ppp/1p6/2p1n3/2N1n3/P3P3/1P2BPPP/1R1R2K1 b - - 0 1","s":["Nxc4","Nd2"],"y":["Bxc4"],"r":1500,"m":"Winning tactic","n":0},{"f":"8/5pkp/P5p1/1Q2p3/RP1pP3/8/2rq1PPP/5BK1 b - - 0 1","s":["Qxf2+","Rc1"],"y":["Kh1"],"r":1500,"m":"Winning tactic","n":0},{"f":"6Q1/q1k5/3pB1p1/2pP1p2/2P2P2/rp2PK1P/8/8 w - - 0 1","s":["Qc8+","Qc6+","Qb5+"],"y":["Kb6","Ka5"],"r":1500,"m":"Mate in 3","n":3},{"f":"8/p2Q1p2/1p3p1p/2b5/5k2/8/PPBr1q1P/R6K w - - 0 1","s":["Qf5+","Qe4+"],"y":["Ke3"],"r":1500,"m":"Mate in 2","n":2},{"f":"8/1b3k1p/pp3pp1/1N6/4nP2/6P1/P5BP/5K2 w - - 0 1","s":["Bxe4","Nd6+","Nxe4"],"y":["Bxe4","Ke6"],"r":1500,"m":"Fork","n":0},{"f":"8/6p1/p1p1n2p/1p2Pk1K/8/P3R3/1PP5/8 b - - 0 1","s":["Nf4+","Ng2+","Nxe3"],"y":["Kh4","Kg3"],"r":1500,"m":"Fork","n":0},{"f":"3rr1k1/5p2/p2q2pB/1pp1p3/3n2Pb/3R2N1/PP1QB1PP/5RK1 b - - 0 1","s":["Nxe2+","Qxd3","Rxd3"],"y":["Qxe2","Qxd3"],"r":1500,"m":"Discovered attack","n":0},{"f":"2k2n2/1p4r1/p2p3p/2pPp3/2Pn3R/2N5/PP2N1PP/6K1 b - - 0 1","s":["Nf3+","Nxh4"],"y":["Kh1"],"r":1500,"m":"Pin","n":0},{"f":"8/1kp5/p3p1p1/2Rp1qP1/1Q1P1P1r/1P3K2/P5P1/8 b - - 0 1","s":["Ka8","Qg4+","Rh2"],"y":["Qd2","Kf2"],"r":1500,"m":"Defensive move","n":0},{"f":"2r3rk/1p1q3p/5n2/3pnp2/3QpN2/PNP4P/1P3PP1/3R1RK1 b - - 0 1","s":["Nf3+","Nxd4"],"y":["Kh1"],"r":1500,"m":"Pin","n":0},{"f":"8/8/4p3/3p4/3K1pk1/8/8/4N3 b - - 0 1","s":["Kg3","f3","e5"],"y":["Nd3","Ke3"],"r":1500,"m":"Defensive move","n":0},{"f":"8/8/4bP2/3k2Np/2p5/2K5/P7/8 b - - 0 1","s":["Ke5","Bxf7","Kf4"],"y":["f7","Nxf7+"],"r":1500,"m":"Sacrifice","n":0},{"f":"1r2r1k1/pp2qp2/2p1n2Q/2P3p1/4B1Pp/7P/P3PPK1/1R5R b - - 0 1","s":["Nf4+","Qxe4"],"y":["Kh2"],"r":1500,"m":"Discovered attack","n":0},{"f":"5k2/5r2/B7/5P1p/P3K2b/1P6/5P2/4R3 b - - 0 1","s":["Re7+","Rxe1"],"y":["Kf3"],"r":1500,"m":"Skewer","n":0},{"f":"1n4k1/5ppp/1p1qp3/rQ6/Pp1P1P2/4PP2/2rNK2P/R5R1 w - - 0 1","s":["Qe8+","Rxg7+","Rg1+","Qxf8"],"y":["Qf8","Kxg7","Kf6"],"r":1500,"m":"Pin","n":0},{"f":"8/kb6/p1npp3/2n1qN1p/4P3/4QP1P/P5P1/1R5K w - - 0 1","s":["f4","Nxd6","Qxd4"],"y":["Qf6","Qd4"],"r":1500,"m":"Pin","n":0},{"f":"3r3k/5p1P/p1Q2P1R/q4Pn1/2p5/2p5/PPP1B3/1K4R1 b - - 0 1","s":["Qb4","Qxb7"],"y":["Qb7"],"r":1500,"m":"Pin","n":0},{"f":"r3kb1r/pppqpn1p/5p2/3p1bpQ/2PP4/2N1P1B1/PP3PPP/R3KB1R b KQkq - 0 1","s":["Bg4","Qxg4"],"y":["Qxg4"],"r":1501,"m":"Trapped piece","n":0},{"f":"5r2/p6p/6pk/4Q3/3Ppq2/6R1/P4PKP/2r5 w - - 0 1","s":["Rh3+","Rxh4+"],"y":["Qh4"],"r":1501,"m":"Mate in 2","n":2},{"f":"8/8/8/pp6/4k1p1/P1P3P1/1P2K3/8 b - - 0 1","s":["a4","axb3"],"y":["b3"],"r":1502,"m":"Zugzwang","n":0},{"f":"rnb2rk1/pppp1ppp/4pq2/8/3P4/3B1N2/P1PB1PPP/Q4RK1 w - - 0 1","s":["Bg5","Bxg6"],"y":["Qg6"],"r":1502,"m":"Trapped piece","n":0},{"f":"6r1/p1qk4/QbN5/3p1p2/8/4P1P1/P7/1R2R1K1 b - - 0 1","s":["Qxg3+","Qg2+"],"y":["Kf1"],"r":1503,"m":"Mate in 2","n":2},{"f":"3r2k1/p2r1pb1/1pQp1q1p/4N1p1/1PP5/6B1/P4PPP/R2R2K1 b - - 0 1","s":["dxe5","Qxc6","Kh7"],"y":["Rxd7","Rxd8+"],"r":1503,"m":"Discovered attack","n":0},{"f":"r4rk1/3b2bn/p2p2p1/2pN3p/p3P2B/6NP/1P3RP1/4R2K w - - 0 1","s":["Ne7+","Nxg6+"],"y":["Kh8"],"r":1505,"m":"Kingside attack","n":0},{"f":"6k1/P4p1p/5pp1/8/5B2/5RKP/PP2r3/4n3 b - - 0 1","s":["Rg2+","Nxf3+"],"y":["Kh4"],"r":1507,"m":"Mate in 2","n":2},{"f":"1r1r3k/2q1b1pp/p7/4Q1pP/3B4/Pp6/1P3P2/1K1N2RR b - - 0 1","s":["Qc2+","Qc1+"],"y":["Ka1"],"r":1508,"m":"Mate in 2","n":2},{"f":"r1b5/R4pkp/3p2p1/2pPr3/2P5/1P1B4/5PPP/R5K1 b - - 0 1","s":["Rxa7","Re1+","Bf5"],"y":["Rxa7","Bf1"],"r":1511,"m":"Defensive move","n":0},{"f":"8/8/2p1k1p1/p1KpP3/P4PP1/8/8/8 b - - 0 1","s":["g5","Kxe5"],"y":["fxg5"],"r":1511,"m":"Deflection","n":0},{"f":"8/2k5/8/1r2p1R1/6p1/3K4/1p4PP/1N6 b - - 0 1","s":["e4+","Rxg5"],"y":["Kc2"],"r":1512,"m":"Discovered attack","n":0},{"f":"r1b4r/1p1pkppp/p2qp3/3Bn3/8/P4P2/1P1B2PP/R2QK2R w KQ - 0 1","s":["Bb4","axb4"],"y":["Qxb4+"],"r":1513,"m":"Pin","n":0},{"f":"3r1rk1/p1p2pbp/1p4p1/7n/4P2q/1P2BP2/P1B3QP/3R1R1K w - - 0 1","s":["Bg5","Qxg3"],"y":["Ng3+"],"r":1514,"m":"Fork","n":0},{"f":"r2q1r1k/4N1bp/p2p2p1/2p3N1/Pp4P1/1Q5P/1P1n1P2/5RK1 w - - 0 1","s":["Qg8+","Nf7+"],"y":["Rxg8"],"r":1514,"m":"Smothered mate","n":2},{"f":"8/5p2/8/2Q3pk/PP4qp/6P1/5PKP/8 b - - 0 1","s":["h3+","Qd1+"],"y":["Kf1"],"r":1516,"m":"Mate in 2","n":2},{"f":"8/3N1Qqk/6pp/3P4/4P3/6P1/q4PKP/8 w - - 0 1","s":["Nf6+","Qe8+","Qxf8+"],"y":["Kh8","Qf8"],"r":1519,"m":"Mate in 3","n":3},{"f":"5rk1/1p4pp/p7/5N2/3Rrn2/6KP/PPR2PP1/8 b - - 0 1","s":["Ne2+","Rxe2"],"y":["Rxe2"],"r":1520,"m":"Fork","n":0},{"f":"rnq3r1/pp3pbk/3p1n2/2pPpPQ1/2P1P3/2N2NP1/PP4KP/R4R2 w - - 0 1","s":["Qh4+","Qxf6"],"y":["Bh6"],"r":1521,"m":"Deflection","n":0},{"f":"r2q1rk1/pbp3pp/1p1p1b2/n3pP2/Q1P5/3B1N2/PP1P1PPP/R1B2RK1 b - - 0 1","s":["e4","Bxe4"],"y":["Bxe4"],"r":1521,"m":"Fork","n":0},{"f":"r4rk1/pQp3p1/3p1q1p/2b1p3/8/2Pb1N2/PP1N1PPP/R4RK1 w - - 0 1","s":["Qd5+","Qxd3"],"y":["Kh8"],"r":1522,"m":"Fork","n":0},{"f":"6r1/pp2bk2/4bp1p/2p5/5p2/2P2N2/PPB2P1P/1K2R3 w - - 0 1","s":["Rxe6","Bb3+","Bxc4+"],"y":["Kxe6","c4"],"r":1525,"m":"Attraction","n":0},{"f":"r5k1/1p2pp2/p2p3B/3P1P2/2P1P1Q1/3p4/Pq6/R4K2 b - - 0 1","s":["Kh7","Kxh6"],"y":["Re1"],"r":1531,"m":"Defensive move","n":0},{"f":"r1bqkb1r/ppp1n1p1/7p/3Pp1NQ/2P5/8/PP3PPP/RNB1K2R b KQkq - 0 1","s":["g6","hxg5"],"y":["Qe2"],"r":1531,"m":"Defensive move","n":0},{"f":"r2qk2r/1p3ppp/2P5/4Pn2/1pPn2b1/3Q1NP1/PP3PBP/RN3RK1 b kq - 0 1","s":["Nxf3+","Bxf3"],"y":["Qxf3"],"r":1534,"m":"Kingside attack","n":0},{"f":"r2qnr1k/pppb2pp/2n4B/3Nb3/8/P5QP/1PP1B1P1/R4RK1 w - - 0 1","s":["Rxf8+"],"y":[],"r":1535,"m":"Mate in 1","n":1},{"f":"7r/1p2Rpk1/pP1p2p1/P2P4/3r4/2p5/2P5/2K2R2 w - - 0 1","s":["Rexf7+","Rh1+","Rxh8"],"y":["Kh6","Kg5"],"r":1535,"m":"Skewer","n":0},{"f":"6k1/p4rp1/8/2p1Bq1p/2P1b3/2P3QP/P5PK/4R3 b - - 0 1","s":["h4","Qxe5+"],"y":["Qxh4"],"r":1536,"m":"Deflection","n":0},{"f":"r1b2rk1/pp3ppp/4pn2/3p4/PP1Q4/2P1P1P1/3NqPBP/R4RK1 b - - 0 1","s":["e5","Qxd2"],"y":["Qxe5"],"r":1540,"m":"Deflection","n":0},{"f":"5rk1/3q1p2/6pK/4P1Qp/6P1/7P/8/8 w - - 0 1","s":["Qf6","g5"],"y":["Qd2+"],"r":1546,"m":"Defensive move","n":0},{"f":"1r6/1n4p1/1P1p1kp1/4p3/2K1P3/5P1P/5BP1/2R5 b - - 0 1","s":["Rc8+","Rxc1"],"y":["Kb5"],"r":1547,"m":"Skewer","n":0},{"f":"3rkb1r/p3pppp/5q2/3b4/8/3Q1P2/PPP3PP/2KR1B1R w k - 0 1","s":["Qb5+","Rxd8+","Qb8+"],"y":["Bc6","Kxd8"],"r":1549,"m":"Discovered attack","n":0},{"f":"8/8/4P1kp/2R2Np1/2P5/1P4K1/r7/4n3 b - - 0 1","s":["Rg2+","g4+","Nf3+"],"y":["Kh3","Kh4"],"r":1552,"m":"Mate in 3","n":3},{"f":"8/8/6p1/PR3p2/1P3k1P/8/r5P1/7K b - - 0 1","s":["Kg3","Ra1+","Rxd1+"],"y":["Rd5","Rd1"],"r":1554,"m":"Mate in 3","n":3},{"f":"3r1rk1/pp2bppp/2ppnn2/8/N1P1P3/q1P4P/P2N2PB/R2Q1R1K w - - 0 1","s":["Nb1","Qxa4"],"y":["Qxa4"],"r":1557,"m":"Trapped piece","n":0},{"f":"r2q1rk1/pbp2pb1/1p1pp1p1/n5n1/3BP3/P1NP3Q/BPP2PP1/R3K2R w KQ - 0 1","s":["Qh8+","Rxh8+"],"y":["Bxh8"],"r":1600,"m":"Mate in 2","n":2},{"f":"8/p3p1k1/1p1p2r1/5Qb1/1P6/2P1P1Pp/q2BKR1P/8 w - - 0 1","s":["Qf8+","Rf7+","Qxf7+"],"y":["Kh7","Qxf7"],"r":1600,"m":"Exposed king","n":0},{"f":"1r4k1/6p1/n2p4/p1pP2rp/2P1Q3/P4q1P/3P1P1K/1BR2R2 b - - 0 1","s":["Rg2+","Qxh3+"],"y":["Kh1"],"r":1600,"m":"Mate in 2","n":2},{"f":"r1bqr1k1/pp1n1pb1/5npp/3N4/1PP5/P6N/1B2B1PP/R2Q1RK1 w - - 0 1","s":["Nxf6+","Qxd8","Bxf6","Rxf6"],"y":["Nxf6","Rxd8","Bxf6"],"r":1600,"m":"Fork","n":0},{"f":"3r2k1/pp3p2/4p1pp/3rP3/1q1P2R1/6Q1/PP4PP/3R2K1 w - - 0 1","s":["Rxg6+","Qxg6+","Qxh6+"],"y":["fxg6","Kh8"],"r":1600,"m":"Sacrifice","n":0},{"f":"4k1r1/p1p5/2P4p/3rNp2/1b1B1P1p/4PR1P/P2n3K/1R6 w - - 0 1","s":["Rxb4","Nxf3"],"y":["Nxf3+"],"r":1601,"m":"Winning tactic","n":0},{"f":"4R3/6Q1/2p5/7p/1P4nq/3P3P/2Pk1rP1/5RK1 b - - 0 1","s":["Rxf1+","Qf2+"],"y":["Kxf1"],"r":1601,"m":"Mate in 2","n":2},{"f":"3r3r/1b4k1/p4qp1/1ppp1p2/5P2/P1P2NP1/1PQ2PK1/3R3R b - - 0 1","s":["Rxh1","d4"],"y":["Kxh1"],"r":1601,"m":"Pin","n":0},{"f":"4r3/pp4pk/2pR2pp/2P5/5nr1/5R2/PPB2P1K/8 w - - 0 1","s":["Rxf4","Bxg6+","Bxe8"],"y":["Rxf4","Kg8"],"r":1602,"m":"Fork","n":0},{"f":"r2qk2r/p1p1bppp/1pn1pn2/2Pp1b2/3P4/P1NBPN2/1P3PPP/R1BQK2R w KQkq - 0 1","s":["Bb5","Bxc6"],"y":["O-O"],"r":1602,"m":"Pin","n":0},{"f":"r1bqk2r/pp3pb1/2np2p1/2p1p3/4P1p1/2NP4/PPPBBPPN/R1Q2RK1 b kq - 0 1","s":["Qh4","exf4"],"y":["Bf4"],"r":1602,"m":"Winning tactic","n":0},{"f":"1k4rr/p3qp2/Ppn1p3/3pP1b1/QP1n1NNp/3P3P/3B2PK/1R2R3 w - - 0 1","s":["b5","Bxf4","hxg4"],"y":["Bxf4+","Rxg4"],"r":1603,"m":"Winning tactic","n":0},{"f":"8/8/3KR3/5pP1/1pk2P2/6n1/4r3/8 w - - 0 1","s":["Rxe2","g6","g7","g8=Q"],"y":["Nxe2","Kc3","b3"],"r":1604,"m":"Promotion","n":0},{"f":"r4rk1/pp3ppp/2bq4/8/3P4/1BQ1pPP1/PP2Nn1P/RN3RK1 b - - 0 1","s":["Bxf3","exf2+","Bxe2"],"y":["Rxf2","Kxf2"],"r":1604,"m":"Kingside attack","n":0},{"f":"1k1r4/ppp2pb1/4b2p/5qp1/1P3p2/5N2/1P3QPP/R1BrR1K1 w - - 0 1","s":["Qxa7+","Qa8+","Rxd1+"],"y":["Kc8","Kd7"],"r":1605,"m":"Interference","n":0},{"f":"r3kb1r/pp3pp1/3pb2p/q1pn4/4Q2B/2N5/PPP2PPP/R3KB1R w KQkq - 0 1","s":["Bb5+","Nxb5"],"y":["Qxb5"],"r":1605,"m":"Winning tactic","n":0},{"f":"4r3/P7/6R1/8/8/5k2/6p1/6K1 b - - 0 1","s":["Re1+","Rh1+"],"y":["Kh2"],"r":1605,"m":"Mate in 2","n":2},{"f":"r1bq1rk1/pp2bppp/2pp1n2/8/5P2/2N2N2/PBPPB1PP/R2Q1RK1 b - - 0 1","s":["Qb6+","Qxb2","Qa3"],"y":["Kh1","Rb1"],"r":1606,"m":"Fork","n":0},{"f":"2kr2r1/ppq1bb1Q/2p1pB2/2npP3/8/2P2N2/PPB2PPP/R4RK1 b - - 0 1","s":["Bxf6","Rh8"],"y":["exf6"],"r":1606,"m":"Winning tactic","n":0},{"f":"r4rk1/pp2qpp1/2n1b2p/8/3PR3/2P2NP1/PPQ2PP1/2K4R w - - 0 1","s":["d5","Rxb4"],"y":["Nb4"],"r":1606,"m":"Winning tactic","n":0},{"f":"r2qrnk1/1bp2p1p/1p1p1p2/3N1P1Q/4PR2/1P6/PP4PP/R5K1 w - - 0 1","s":["Rg4+","fxg6","Rxg6+","Qxg6+"],"y":["Ng6","fxg6","hxg6"],"r":1607,"m":"Kingside attack","n":0},{"f":"8/b1p3k1/p1ppr1p1/3bP3/3r3N/1P4R1/P4PPP/3R2K1 w - - 0 1","s":["Nf5+","Nxd4"],"y":["Kf7"],"r":1607,"m":"Pin","n":0},{"f":"2Q5/6kr/p7/3p4/2pP1q2/1P6/P4PP1/R1R2K2 b - - 0 1","s":["Rh1+","Qe4+","Qd3+"],"y":["Ke2","Kd2"],"r":1607,"m":"Mate in 3","n":3},{"f":"8/8/1p2kP2/3pP1p1/bP1P2pp/3B4/5KP1/8 w - - 0 1","s":["Bf5+","f7"],"y":["Kxf5"],"r":1607,"m":"Sacrifice","n":0},{"f":"r1b1k2r/p4p1p/2p1p3/1pRnPp2/q2P4/2Q2N1P/5PP1/1B3RK1 w kq - 0 1","s":["Rxd5","Qc6+"],"y":["cxd5"],"r":1608,"m":"Clearance","n":0},{"f":"4r2k/2q4r/2p4Q/p5P1/1p1Pp1P1/2P1N2P/PP6/4bRK1 w - - 0 1","s":["Rf8+","Qxf8+"],"y":["Rxf8"],"r":1609,"m":"Mate in 2","n":2},{"f":"4rr1k/pp4pp/2p1B3/2bnpP1q/8/2NP1R2/PPPB2QP/4K3 w - - 0 1","s":["Rh3","Kxf2","Qxh3"],"y":["Bf2+","Qxh3"],"r":1610,"m":"Trapped piece","n":0},{"f":"r4rk1/p1npqppp/b1n1p3/4P3/1p2N3/3Q1N2/PPB2PPP/R2R2K1 w - - 0 1","s":["Nf6+","Qxh7+"],"y":["gxf6"],"r":1610,"m":"Mate in 2","n":2},{"f":"r4rk1/p4p1p/1p2p1p1/8/2Pb4/q4P2/3B1P1P/1R1QR1K1 w - - 0 1","s":["Bb4","Rxb4"],"y":["Qxb4"],"r":1611,"m":"Fork","n":0},{"f":"R4br1/P2bkp2/2p2p1p/4p3/4QnP1/7P/3PKP2/2q2B1R w - - 0 1","s":["Kf3","hxg4","Ke3"],"y":["Bxg4+","Qd1+"],"r":1611,"m":"Defensive move","n":0},{"f":"r2q1r2/2p1k1p1/p1n1p1Qp/3p2P1/3b3P/PP1B1N2/5P2/R4RK1 w - - 0 1","s":["Nxd4","Qxg7+","Qxd4"],"y":["Nxd4","Rf7"],"r":1612,"m":"Fork","n":0},{"f":"r2q2k1/pp3ppp/3Pr3/8/2N1nB2/5QbP/PP2B1P1/3R1K2 w - - 0 1","s":["Bxg3","Bf4"],"y":["Rf6"],"r":1612,"m":"Defensive move","n":0},{"f":"4r1k1/pp3ppp/1q4b1/1Nb5/2Q4B/2P4P/PP3PP1/R5K1 b - - 0 1","s":["Re4","Rxh4"],"y":["Nd4"],"r":1613,"m":"Interference","n":0},{"f":"r5k1/1p2b1pp/1qpp4/p3p3/2P1P1b1/P1N2N2/QP4PP/5RK1 w - - 0 1","s":["c5+","cxb6"],"y":["Kh8"],"r":1614,"m":"Discovered attack","n":0},{"f":"r2qr1k1/p1p1bpBp/2pp1n2/8/4P1bP/6Q1/PPP2PP1/RN2K2R w KQ - 0 1","s":["Bxf6","Qxg4+"],"y":["Bxf6"],"r":1614,"m":"Pin","n":0},{"f":"8/4RNkP/1r6/6K1/8/8/8/1q6 w - - 0 1","s":["h8=Q+"],"y":[],"r":1615,"m":"Mate in 1","n":1},{"f":"1r4k1/p3R2p/3p2pQ/3q4/3b4/3p4/PP3rPP/1RB4K w - - 0 1","s":["Qxh7+","Bh6+","Qxg7+"],"y":["Kf8","Bg7"],"r":1616,"m":"Mate in 3","n":3},{"f":"r2q1rk1/pp3ppp/2p1b3/2R5/2P5/3P1Q1P/P1P2PP1/R1B3K1 b - - 0 1","s":["Qd4","Qxc5"],"y":["Rb1"],"r":1616,"m":"Fork","n":0},{"f":"1k6/bp1r2p1/P1R4p/5q1P/5Pp1/6P1/1QR5/2K5 b - - 0 1","s":["Be3+","Rd1+","Qa5+"],"y":["Kb1","Ka2"],"r":1618,"m":"Exposed king","n":0},{"f":"2rr2k1/pp3ppp/2n5/3p4/QP1N4/P3P3/1q3PPP/2R2RK1 b - - 0 1","s":["Nxd4","Ne2+","Rxc8"],"y":["Rxc8","Kh1"],"r":1619,"m":"Sacrifice","n":0},{"f":"5rk1/5ppp/4p3/1Qn5/3qP3/3PRB2/PP4PP/RN4K1 b - - 0 1","s":["Qxe3+","Nxd3","Qxd3+"],"y":["Kf1","Qxd3"],"r":1619,"m":"Kingside attack","n":0},{"f":"4rR2/3NP1kp/2p3p1/5p2/8/2rp3P/5PP1/4R1K1 b - - 0 1","s":["d2","Rc1","Rxd1"],"y":["Rd1","Kh2"],"r":1621,"m":"Pin","n":0},{"f":"r3rk2/ppp1n1pQ/6P1/4p1P1/4Ppq1/1PP5/P4P2/RNB1K3 w Q - 0 1","s":["Qh8+","Ba3+","Bxe7+","Qxg7+"],"y":["Ng8","Re7","Kxe7"],"r":1621,"m":"Pin","n":0},{"f":"2rq1rk1/1b3pp1/3b1n1p/p2Pp3/Ppn1P3/3BBN1P/2Q1NPP1/R2R2K1 w - - 0 1","s":["Bxc4","Nd2","Nxc4"],"y":["Ba6","Bxc4"],"r":1628,"m":"Quiet move","n":0},{"f":"2k5/2pq1bb1/p2p3p/B1nP1p2/2PNr1p1/5N2/5PPP/1R1Q2K1 w - - 0 1","s":["Nc6","dxc6"],"y":["Qxc6"],"r":1629,"m":"Quiet move","n":0},{"f":"2r3k1/ppr2pp1/7p/3p2q1/2nN4/PPR1P2P/2Q2PP1/2R3K1 b - - 0 1","s":["Nxe3","Rxc3","Rxc3"],"y":["fxe3","Qxc3"],"r":1630,"m":"Discovered attack","n":0},{"f":"2r3k1/6pp/2b5/3R4/3P4/2R1P1BP/5P1K/1r6 b - - 0 1","s":["Rh1+","Bxd5+","Rxc3"],"y":["Kxh1","Kh2"],"r":1631,"m":"Discovered attack","n":0},{"f":"r7/ppp1kp2/4n2r/4P1p1/6P1/2q1B2Q/P6P/5RK1 w - - 0 1","s":["Bxg5+","Qxc3"],"y":["Nxg5"],"r":1632,"m":"Discovered attack","n":0},{"f":"5rk1/6pp/Q3p3/3p4/3n2q1/P7/1PPN3P/2KR4 b - - 0 1","s":["Ne2+","Nc3+","Qxd1+"],"y":["Kb1","bxc3"],"r":1633,"m":"Discovered attack","n":0},{"f":"2r2rk1/pbqn1pbp/1p2p1p1/2p1n3/2P5/1P3NPP/PBQN1PB1/R3R1K1 w - - 0 1","s":["Nxe5","Bxb7"],"y":["Nxe5"],"r":1633,"m":"Discovered attack","n":0},{"f":"2r2rk1/1p1b1ppp/p3p1n1/3pP3/P1q5/R4NP1/1B1Q1P1P/4KB1R b K - 0 1","s":["Qe4+","Rc2"],"y":["Be2"],"r":1634,"m":"Clearance","n":0},{"f":"8/3pk3/R7/1R2PK1p/2PPn1r1/8/8/8 b - - 0 1","s":["Ng3+"],"y":[],"r":1636,"m":"Mate in 1","n":1},{"f":"7R/8/8/6p1/2p1p1k1/2Pb3p/P4K2/8 b - - 0 1","s":["e3+","Kg3"],"y":["Kxe3"],"r":1636,"m":"Defensive move","n":0},{"f":"4Q3/6pk/p3p2p/5P2/1p1P4/4q2P/2B1n2B/7K b - - 0 1","s":["Qf3+"],"y":[],"r":1638,"m":"Mate in 1","n":1},{"f":"5k2/3b2q1/pn4p1/1rp2p2/8/8/1P2Q1P1/1K2R2R w - - 0 1","s":["Rh8+","Qe7+","Qd8+"],"y":["Qxh8","Kg8"],"r":1639,"m":"Sacrifice","n":0},{"f":"r3k2r/pppqbppp/2n1b3/3p2PQ/PP1Pp2P/2P1P3/5PB1/RNB1K1NR b KQkq a3 0 1","s":["Bg4","Bxh5","Kxd7"],"y":["Bh3","Bxd7+"],"r":1639,"m":"Trapped piece","n":0},{"f":"2k3r1/pp1b1p2/2pp1q2/8/2BpP2P/2Q2nb1/PPP5/2K2R1R w - - 0 1","s":["Qxf3","Kb1"],"y":["Qh6+"],"r":1642,"m":"Defensive move","n":0},{"f":"2rk1bnr/Q1q1pBpp/1n6/8/3P4/4PP2/3N1P1P/R1B1K2R b KQ - 0 1","s":["Qxa7","Rxc1+","Rxh1"],"y":["Rxa7","Ke2"],"r":1642,"m":"Skewer","n":0},{"f":"4r1k1/ppqb4/6p1/3pb2Q/8/2P5/PP1B2PP/5RK1 w - - 0 1","s":["Qxg6+","Rf7","Kh1","Rxf8+"],"y":["Bg7","Qc5+","Qf8"],"r":1700,"m":"Pin","n":0},{"f":"6k1/8/5B2/1R3K2/6p1/6P1/P4P1q/8 b - - 0 1","s":["Qh5+","Qf7+","Qc4+"],"y":["Bg5","Kxg4"],"r":1700,"m":"Winning tactic","n":0},{"f":"r3r3/3kp2p/p1p1Rbp1/3p4/N7/6P1/PP3PP1/4R1K1 w - - 0 1","s":["Nb6+","Nxa8+"],"y":["Kc7"],"r":1700,"m":"Fork","n":0},{"f":"r4rk1/ppp2pp1/1b1p1q1p/3Np3/1P1nP1n1/P4N2/2PPRPB1/R1BQ2K1 b - - 0 1","s":["Nxf3+","Qxf3"],"y":["Bxf3"],"r":1700,"m":"Kingside attack","n":0},{"f":"2k2b1r/ppp2qp1/4rp1p/8/1n6/2NQ1N1P/PPP2PP1/R3R1K1 w - - 0 1","s":["Qf5","Qxe6+","Rxe6"],"y":["g6","Qxe6"],"r":1702,"m":"Winning tactic","n":0},{"f":"3qr1k1/1b3pp1/p2p1b2/1p6/1P2PB2/P1pP1PQ1/B5PP/4R1K1 b - - 0 1","s":["Bh4","Bxe1"],"y":["Qg4"],"r":1702,"m":"Skewer","n":0},{"f":"3q2rk/p2P4/2p4b/5Q2/4N2P/8/PPP3P1/4R2K b - - 0 1","s":["Qxh4+","Qxe1+","Qh4+"],"y":["Kg1","Kh2"],"r":1702,"m":"Fork","n":0},{"f":"2k5/1p5R/p2p4/6p1/3N2P1/1PP3KP/1P3P2/4q3 b - - 0 1","s":["Qe5+","Qf4+","Qe4+"],"y":["Kf3","Kg2"],"r":1703,"m":"Winning tactic","n":0},{"f":"r4r2/p1p2p1k/b1p1pQ2/6p1/6N1/2B5/P1P1KPP1/7q w - - 0 1","s":["Kf3","Kg3","Be5"],"y":["Qd1+","Qd6+"],"r":1703,"m":"Defensive move","n":0},{"f":"r1bq1rk1/pp3p2/2np3p/4p1p1/2B5/2PQ1Nn1/P1P2PPP/R4RK1 w - - 0 1","s":["Qg6+","Qxh6+"],"y":["Kh8"],"r":1703,"m":"Pin","n":0},{"f":"r2q1rk1/p1p1bppp/2pp2b1/4p3/4n1PN/2NP3P/PPP2PK1/R1BQ1R2 w - - 0 1","s":["Nxg6","Nxe7+","bxc3"],"y":["Nxc3","Qxe7"],"r":1704,"m":"Kingside attack","n":0},{"f":"2Q2rk1/3R1p1p/p3p1p1/1p4q1/5P2/P1N5/BPP3bP/2K4R b - - 0 1","s":["Qxf4+","Rxc8"],"y":["Kb1"],"r":1704,"m":"Winning tactic","n":0},{"f":"5rk1/2pp1q1p/n5p1/pQ1PP3/3PB1PP/P4p2/5P2/R5K1 b - - 0 1","s":["Qf4","Qxe4"],"y":["Qxd7"],"r":1704,"m":"Winning tactic","n":0},{"f":"2krq2r/ppp2N2/4p2p/6pQ/1bPnN1P1/8/PP3PP1/R4RK1 b - - 0 1","s":["Ne2+","Nf4"],"y":["Kh1"],"r":1704,"m":"Winning tactic","n":0},{"f":"N1bk3r/pp1p1ppp/8/4P3/1b6/q1B2Q2/P2K1PPP/R4B1R b - - 0 1","s":["Qb2+","Bxc3"],"y":["Kd1"],"r":1704,"m":"Pin","n":0},{"f":"r1b1k2r/1pb2pp1/2p3p1/p2Pn1B1/3p4/P2P3P/BPPN1PPK/R4R2 b kq - 0 1","s":["Nf3+","Nxg5"],"y":["Kh1"],"r":1705,"m":"Double check","n":0},{"f":"r2q1rk1/3pb1pp/1p1Npn2/pB1bB3/3P3P/PQ6/1P3P2/R3K1R1 w Q - 0 1","s":["Qg3","Bd3","Bxg6"],"y":["g6","Bxd6"],"r":1708,"m":"Sacrifice","n":0},{"f":"2r1r1k1/1bp4p/p5p1/2bp1pB1/5P2/qB1Q4/4RRPP/6K1 w - - 0 1","s":["Bxd5+","Qxa3","Bxb7","Rxe2"],"y":["Kg7","Bxa3","Rxe2"],"r":1710,"m":"Discovered attack","n":0},{"f":"4R3/1p4k1/1q3bpp/3B4/4Np1P/p4P2/3RK1P1/8 b - - 0 1","s":["Qb5+","Qxe8"],"y":["Rd3"],"r":1711,"m":"Fork","n":0},{"f":"5r1k/2p3p1/7p/p4N2/Pb1B4/3n1b2/1PP4P/R5K1 w - - 0 1","s":["Bxg7+","Bxf8","cxd3"],"y":["Kh7","Bxf8"],"r":1711,"m":"Fork","n":0},{"f":"7k/2r3p1/1p2p2b/3p2NQ/1q1P4/1p6/5R2/6K1 w - - 0 1","s":["Qe8+","Rxf8+"],"y":["Qf8"],"r":1712,"m":"Mate in 2","n":2},{"f":"8/4kp2/2p4p/p1P2Kp1/6P1/P6P/1P6/8 b - - 0 1","s":["a4","f6+","Kf7"],"y":["Ke5","Kf5"],"r":1712,"m":"Zugzwang","n":0},{"f":"2q3k1/p2bQppp/1p2p3/3pP3/3P4/5N2/P4PPP/4K2R b K - 0 1","s":["Qc1+","Bb5+"],"y":["Ke2"],"r":1712,"m":"Mate in 2","n":2},{"f":"8/1Q2R1pk/p6p/Pp6/1P6/6rP/3r1qP1/6RK b - - 0 1","s":["Rxh3+","Qh2+"],"y":["gxh3"],"r":1715,"m":"Mate in 2","n":2},{"f":"5rq1/p2k4/1pp1p2Q/3pR3/1n1P4/3P2P1/PP3P1P/6K1 w - - 0 1","s":["Rg5","Rg7","Rxf7"],"y":["Qf7","Kd6"],"r":1717,"m":"Pin","n":0},{"f":"r2q2rk/pp1n2np/2p5/3pPp2/3P1Q1N/8/PPP2PPP/R4RK1 w - f6 0 1","s":["Ng6+","Qh6+"],"y":["hxg6"],"r":1718,"m":"Mate in 2","n":2},{"f":"1Rb5/p4p1k/3q1Pp1/2p5/3p1p1P/5P2/PQ4P1/6K1 b - - 0 1","s":["d3","d2","d1=Q+"],"y":["Rxc8","Qb3"],"r":1720,"m":"Sacrifice","n":0},{"f":"6k1/8/1ppp3p/4pp2/P7/6K1/1PP3PP/8 w - f6 0 1","s":["b4","a5","a6"],"y":["Kf7","Ke6"],"r":1720,"m":"Quiet move","n":0},{"f":"8/5kp1/7p/8/5PKP/r4RP1/8/8 b - - 0 1","s":["h5+","Rxf3"],"y":["Kg5"],"r":1720,"m":"Deflection","n":0},{"f":"6rk/5R2/3p1q1p/3P2pQ/1P2P3/3P1p1P/P1r3PB/1R5K b - - 0 1","s":["fxg2+","Qd4+","Qxf2+"],"y":["Kg1","Rf2"],"r":1721,"m":"Mate in 3","n":3},{"f":"5r1k/pp4p1/b1p1Q2p/3p4/PP1P2P1/5PbP/4N1Bq/R3RK2 b - - 0 1","s":["Rxf3+","Qf2+"],"y":["Bxf3"],"r":1721,"m":"Mate in 2","n":2},{"f":"r1bqk2r/pp5p/3b1p2/3pNn2/4p3/2N5/PPP2PPP/R2QKB1R w KQkq - 0 1","s":["Qh5+","Qf7+"],"y":["Kf8"],"r":1722,"m":"Mate in 2","n":2},{"f":"r2q1rk1/1b3ppp/p2b4/1p1n4/2P1R3/1BP2N2/PP3PPP/R1BQ2K1 b - - 0 1","s":["Nxc3","Bxe4"],"y":["bxc3"],"r":1722,"m":"Discovered attack","n":0},{"f":"5n2/p3n2Q/2p2q2/2PpN1Np/3P1k2/8/P4PK1/8 w - - 0 1","s":["Nh3+"],"y":[],"r":1722,"m":"Mate in 1","n":1},{"f":"1rr3k1/5p2/3p2p1/3PP3/1p5R/2p2P2/2Q3PP/6K1 b - - 0 1","s":["b3","b2","b1=Q+","Rb2+","Qe1+","Qxh4+"],"y":["Qc1","Qh6","Kf2","Kg3","Kh3"],"r":1723,"m":"Promotion","n":0},{"f":"1r2k1nr/3b1ppp/1q1Qp3/8/8/B3P1P1/5P1P/5RK1 w k - 0 1","s":["Qf8+"],"y":[],"r":1724,"m":"Mate in 1","n":1},{"f":"3r1rk1/p4p1p/4nQp1/3pp1P1/1P5P/2N1P3/2PK1Pq1/1R5R w - - 0 1","s":["Rbg1","Rxg1"],"y":["Qxg1"],"r":1724,"m":"Trapped piece","n":0},{"f":"3q1rk1/p4pp1/1n1b1n1p/2pPp3/8/QBPPBP2/Pr1N1P1P/R3K2R b KQ - 0 1","s":["Rxd2","c4","cxb3"],"y":["Kxd2","Qa6"],"r":1724,"m":"Sacrifice","n":0},{"f":"r4rk1/1p3ppp/p1n1b3/2NpP3/3q4/P2B3P/5PP1/2RQ1RK1 w - - 0 1","s":["Nxe6","Rxc6","Qxd3"],"y":["fxe6","Qxd3"],"r":1725,"m":"Discovered attack","n":0},{"f":"8/6pk/1pqr2bp/8/2P2Q2/7P/3R2PK/5R2 b - - 0 1","s":["Rf6","Rxf1"],"y":["Qb8"],"r":1725,"m":"Skewer","n":0},{"f":"5rk1/5pp1/3p3p/4p3/4N3/PR6/1p3PPP/6K1 b - - 0 1","s":["Rc8","Rc1+"],"y":["g3"],"r":1800,"m":"Quiet move","n":0},{"f":"8/P1q4p/5pk1/6p1/5P2/6KP/5QP1/7r w - - 0 1","s":["a8=Q","Qaf3"],"y":["Qc3+"],"r":1800,"m":"Promotion","n":0},{"f":"8/p7/1p2kp2/3p2p1/5PP1/4K3/PP2P3/8 w - - 0 1","s":["fxg5","Kd4"],"y":["fxg5"],"r":1800,"m":"Winning tactic","n":0},{"f":"rn1qk2r/pp1b1pp1/3bpn1p/1B1pN3/3Q1B2/4P3/PPP2PPP/RN2K2R w KQkq - 0 1","s":["Nxd7","Bxd6"],"y":["Nbxd7"],"r":1801,"m":"Discovered attack","n":0},{"f":"3r2k1/5ppp/b1p4P/1p2pP2/1P2P3/p1n1QKP1/P1qN2B1/7R w - - 0 1","s":["Qg5","Kg4","Qf6"],"y":["Qd3+","g6"],"r":1801,"m":"Defensive move","n":0},{"f":"3r2k1/p3qppp/2P2P2/1N6/6Q1/1B6/PPP3PP/2K1b3 b - - 0 1","s":["Bd2+","Qe1+","Qxd1+"],"y":["Kb1","Qd1"],"r":1801,"m":"Mate in 3","n":3},{"f":"2rr2k1/pB3p1p/5p2/5b2/1b6/6P1/PP2PP1P/R1B2K1R b - - 0 1","s":["Bh3+","Rd1+"],"y":["Bg2"],"r":1801,"m":"Mate in 2","n":2},{"f":"r1qr3k/pp3pb1/1np1p3/8/3P3P/2N2PR1/PP1Q2P1/2KR4 w - - 0 1","s":["Qg5","Qh5+","Qxh6+"],"y":["Rg8","Bh6+"],"r":1802,"m":"Mate in 3","n":3},{"f":"r3kbnr/p5pp/2pp2q1/4n2b/2P1Pp2/P1N2N1P/4BP1R/1RBQK3 w kq - 0 1","s":["Nxe5","Kd2","Bxd1"],"y":["Qg1+","Qxd1+"],"r":1802,"m":"Winning tactic","n":0},{"f":"r1q2rk1/1b4pp/p2b1n2/2ppNQ2/2P5/P1NBP2P/5PP1/1R2R1K1 b - - 0 1","s":["Qxf5","Bxe5","Kh8"],"y":["Bxf5","Be6+"],"r":1802,"m":"Remove the defender","n":0},{"f":"2bk1b1r/1r3ppp/p1Q1p3/qp6/4Pn2/1B1PB3/PP1N2PP/R3K2R b KQ - 0 1","s":["Nxg2+","Nxe3"],"y":["Ke2"],"r":1802,"m":"Fork","n":0},{"f":"r2qk2r/2p2ppp/ppPp2b1/4p1b1/B5P1/3P1N1P/PPP2P2/R2QK2R w KQkq - 0 1","s":["h4","h5"],"y":["Bf4"],"r":1803,"m":"Winning tactic","n":0},{"f":"3r2k1/3Q1pp1/1p3q1p/5N2/8/P1r2P1P/P5P1/4R2K w - - 0 1","s":["Ne7+","Qxe7"],"y":["Qxe7"],"r":1803,"m":"Interference","n":0},{"f":"3rk2r/ppp1q3/4n2n/6p1/2Q4p/7P/Pb2BPPB/RN2K2R w KQk - 0 1","s":["Qb5+","Qxb2","Nc3"],"y":["Kf7","Nd4"],"r":1803,"m":"Fork","n":0},{"f":"2r2rk1/pp4pp/1n2b3/3p4/3Qp1q1/1P4P1/PB3PBP/R4RK1 w - - 0 1","s":["Bh3","Bxg4"],"y":["Rf7"],"r":1804,"m":"Winning tactic","n":0},{"f":"6k1/5pp1/5b1p/2R5/P7/2p1KP1P/3r4/1R6 b - - 0 1","s":["Bd4+","Bxc5"],"y":["Ke4"],"r":1804,"m":"Fork","n":0},{"f":"r4k1r/5pp1/p3pn1p/1bNp4/3n1P2/3B3N/q1PQ2PP/1R3RK1 w - - 0 1","s":["Ra1","Rfb1","gxf3"],"y":["Qb2","Nf3+"],"r":1804,"m":"Clearance","n":0},{"f":"R1b1r1k1/2Bq1pp1/3Q3p/3n4/8/5N1P/1P3PP1/6K1 b - - 0 1","s":["Nxc7","Bxd7"],"y":["Qxd7"],"r":1804,"m":"Winning tactic","n":0},{"f":"r3kr2/npp2pQ1/p1bqpP1B/3n4/1P6/P1N5/5PPP/R4RK1 w q - 0 1","s":["Ne4","Nxd6+"],"y":["O-O-O"],"r":1805,"m":"Winning tactic","n":0},{"f":"4r1k1/2pQ1ppq/1p2r2p/2p1N3/2P1b3/P2P4/1P3PPP/4R1K1 w - - 0 1","s":["Qxf7+","Rxe4","dxe4"],"y":["Kh8","Qxe4"],"r":1806,"m":"Kingside attack","n":0},{"f":"r3kb1r/pp1qnppp/2n1b3/2ppp1P1/2P4P/1QN5/PP1PPPB1/R1B1K1NR w KQkq - 0 1","s":["cxd5","Bxd5"],"y":["Nxd5"],"r":1806,"m":"Fork","n":0},{"f":"1r3b2/5p1k/3P1qRP/r1n1p3/ppB5/P2Q1P2/1PP5/1K6 w - - 0 1","s":["Rg7+","Qh7+"],"y":["Kxh6"],"r":1808,"m":"Mate in 2","n":2},{"f":"r3k2r/pp1bbppp/1q3n2/1Q1pN3/3p4/2N5/PPP2PPP/1RB1R1K1 w kq - 0 1","s":["Nxd7","Nxf6+","Nxb5"],"y":["Qxb5","Kd8"],"r":1808,"m":"Pin","n":0},{"f":"r2k1bnr/p1pp1Bpp/1p6/4N1q1/3p4/2P5/PP2QPbP/RN2K2R w KQ - 0 1","s":["Nc6+","Qe8+"],"y":["Bxc6"],"r":1811,"m":"Mate in 2","n":2},{"f":"1rq1b1k1/2p2ppp/3p4/8/3Q1PP1/1BB1n1rP/PPP2R1K/3R4 b - - 0 1","s":["Rxh3+","Qxg4+"],"y":["Kxh3"],"r":1811,"m":"Attraction","n":0},{"f":"r1b2rk1/pp3ppp/5n2/1N1p4/B7/7P/q4PP1/2RQR1K1 w - - 0 1","s":["Re2","Qxe2"],"y":["Qxe2"],"r":1812,"m":"Trapped piece","n":0},{"f":"4n1k1/5r2/p3p2Q/1p1qP1p1/8/5PP1/P1r1n1KP/1RB2R2 w - - 0 1","s":["Qg6+","Qxc2","Rxf3"],"y":["Ng7","Rxf3"],"r":1813,"m":"Fork","n":0},{"f":"3rr1k1/ppp1bpp1/2q2n2/8/2Q3b1/4BN2/PPPN1PPP/R2R2K1 b - - 0 1","s":["Bxf3","Rxd2","Rxd1+"],"y":["gxf3","Qxc6"],"r":1814,"m":"Kingside attack","n":0},{"f":"1r6/pp2kppQ/2n1p1n1/3p2P1/5P2/2PqP3/PP1N4/2KR3R b - - 0 1","s":["Nb4","Rc8+","Rxc4+"],"y":["cxb4","Nc4"],"r":1815,"m":"Mate in 3","n":3},{"f":"3r2k1/p4B1p/1p3qp1/5b2/8/1Qr1PP1P/P2R1KP1/7R b - - 0 1","s":["Kg7","Qxc3"],"y":["Qxc3"],"r":1815,"m":"Defensive move","n":0},{"f":"5r1k/1B4p1/4P2p/Pp2q3/1B6/8/2P3QP/7K b - - 0 1","s":["Qa1+","Rf1","Rxg1+","Qxa5"],"y":["Qg1","Bc5","Bxg1"],"r":1815,"m":"Pin","n":0},{"f":"r4k1r/1pp2pp1/1b1p1P2/pP6/P2PNnq1/1Q3N1p/5P2/R1B1RB1K b - - 0 1","s":["Qg2+","hxg2+","Rh1+"],"y":["Bxg2","Kg1"],"r":1815,"m":"Mate in 3","n":3},{"f":"8/pp4p1/3p2rp/2p3k1/P2p1R2/1P1P1KN1/2P2P2/1r6 w - - 0 1","s":["Rf5+","Rh5+"],"y":["Kh4"],"r":1815,"m":"Hook mate","n":2},{"f":"1Q2nkr1/5p2/3p2b1/2pP4/2P1p3/4P1B1/P2KBPP1/q7 w - - 0 1","s":["Bxd6+","Be5+","Qxg8+","Bxa1"],"y":["Kg7","Nf6","Kxg8"],"r":1817,"m":"Fork","n":0},{"f":"1r2k2r/4bNp1/pq1pQ1Pp/5p1P/n2P4/B1pB1b2/P1P2P2/K2R2R1 b k - 0 1","s":["Qb2+","cxb2+","Nc3+"],"y":["Bxb2","Kb1"],"r":1817,"m":"Mate in 3","n":3},{"f":"r1b2rk1/5p1p/p3pq2/1p1p4/7n/1P5P/P1P1QPB1/1K1R2R1 w - - 0 1","s":["Bxd5+","Bxa8"],"y":["Ng6"],"r":1818,"m":"Discovered attack","n":0},{"f":"2kr3r/1pp2ppp/pbp5/3b4/4N2q/3PB2P/PPP2PP1/R2Q1R1K w - - 0 1","s":["Bg5","gxh3"],"y":["Qxh3+"],"r":1818,"m":"Trapped piece","n":0},{"f":"8/2q2p1k/4p1pp/1p2P3/P3QP2/7P/6PK/8 b - - 0 1","s":["Qc4","bxc4","c3","c2","c1=Q","Qxf4+"],"y":["Qxc4","a5","a6","a7","a8=Q"],"r":1818,"m":"Promotion","n":0},{"f":"7k/p1q4p/5Pp1/1ppb4/3n1PQ1/2KP4/PP6/2R1R3 b - - 0 1","s":["Qa5+","Qxb4+"],"y":["b4"],"r":1819,"m":"Mate in 2","n":2},{"f":"4r3/ppR3p1/3pq1k1/4prp1/8/1P1Q3P/P6P/5R1K w - - 0 1","s":["Rxf5","Rxg7+","Rf7+","Qxf5+"],"y":["Qxf5","Kf6","Kxf7"],"r":1819,"m":"Deflection","n":0},{"f":"q4r1k/5pbp/2Np1np1/3b2B1/pQ6/5B2/P4PPP/4R1K1 w - - 0 1","s":["Bxf6","Bxg7+","Qc3+"],"y":["Bxc6","Kxg7"],"r":1900,"m":"Attraction","n":0},{"f":"6k1/5R2/p6P/1pbq2r1/3p4/2P5/P4QP1/6K1 w - - 0 1","s":["h7+","Qf6+","Qxg7+"],"y":["Kh8","Rg7"],"r":1900,"m":"Mate in 3","n":3},{"f":"5r1k/p3q1b1/1p4Qp/2p1P3/2P5/1P4P1/P5K1/2B4R b - - 0 1","s":["Qb7+","Rf1+","Qxh1+","Qxc1","Qb2+"],"y":["Kg1","Kxf1","Ke2","e6"],"r":1900,"m":"Skewer","n":0},{"f":"r5k1/p1pN1p2/1p1b2p1/3p1n2/3P4/2P3Pq/P2QRP1P/1R4K1 b - - 0 1","s":["Nh4","Kg7"],"y":["Nf6+"],"r":1901,"m":"Quiet move","n":0},{"f":"1r2r1k1/3nbp1p/p1q1p1p1/3pR2Q/3B4/3B4/PPP2PPP/R5K1 w - - 0 1","s":["Qxh7+","Rh5+","Rh8+"],"y":["Kxh7","Kg8"],"r":1901,"m":"Mate in 3","n":3},{"f":"3r1rk1/p1R3p1/Bp2bp1p/8/4qB1Q/1P5P/P5PK/8 w - - 0 1","s":["Rxg7+","Bxh6+","Qxe4+"],"y":["Kxg7","Kg6"],"r":1901,"m":"Discovered attack","n":0},{"f":"2r4r/Q3bk2/3pn1pp/3N1b2/2qN3P/2P1B3/PP3P2/2KR2R1 b - - 0 1","s":["Qxd5","Qxf5"],"y":["Nxf5"],"r":1901,"m":"Winning tactic","n":0},{"f":"8/p1NR2bp/4pkp1/2p2p2/4n3/P3B1P1/7r/2K5 w - - 0 1","s":["Ne8+","Bf4+"],"y":["Ke5"],"r":1901,"m":"Mate in 2","n":2},{"f":"2r3k1/1pR3bp/p2p2p1/1q1P2B1/4r3/1P3N2/3Q2PP/2R3K1 b - - 0 1","s":["Rxc7","Qb6+"],"y":["Rxc7"],"r":1902,"m":"Winning tactic","n":0},{"f":"3rr1k1/p4pbp/1pn2qp1/2ppp2b/4P3/1PPQ1N2/PB1PBPP1/2K3RR w - - 0 1","s":["g4","Rxg4"],"y":["Bxg4"],"r":1903,"m":"Trapped piece","n":0},{"f":"7k/ppp3rr/1b1p4/4pQ2/4P1q1/P2P2B1/1PP1RP1P/R5K1 b - - 0 1","s":["Qxg3+","Rxg3+","Rh1+"],"y":["hxg3","Kf1"],"r":1904,"m":"Mate in 3","n":3},{"f":"6k1/b3q2p/p1Rrp1p1/1p3p2/1P3P2/P3PQ2/2B2P1P/6K1 b - - 0 1","s":["Qb7","Qxf3"],"y":["Rxd6"],"r":1904,"m":"Winning tactic","n":0},{"f":"4r1k1/6p1/p3p3/1p1q1p2/2p2P2/2n1PQ2/PPR4P/4B1K1 w - - 0 1","s":["Qh5","Qxe8+"],"y":["Qd1"],"r":1905,"m":"Winning tactic","n":0},{"f":"3r2k1/5ppp/1P6/3q4/2Qbp3/6PP/6K1/3R4 w - - 0 1","s":["Qxd5","b7","Rxd4"],"y":["Rxd5","Rb5"],"r":1905,"m":"Winning tactic","n":0},{"f":"4k1r1/p4p2/1pb1pB2/2b4p/4P2P/1P1r2P1/P4PB1/RN3RK1 b - h3 0 1","s":["Rdxg3","Rxg2"],"y":["Kh1"],"r":1907,"m":"Pin","n":0},{"f":"r2qr1k1/pb2bppN/2p1p3/1p1pN3/3PnP2/2P1P3/PP4PP/R2Q1RK1 w - - 0 1","s":["Qh5","Nxg6","Qxg6+"],"y":["g6","fxg6"],"r":1907,"m":"Kingside attack","n":0},{"f":"3r3k/1Qp3p1/p4q1p/8/3N4/8/PPP2PPP/2K1R3 b - - 0 1","s":["Qxd4","Qd2+","Qxe1+"],"y":["a3","Kb1"],"r":1908,"m":"Fork","n":0},{"f":"r1b2rk1/p3n1b1/6pp/1q1np3/2RpNPPP/3Q3N/1PPB4/3B1RK1 w - - 0 1","s":["Rxc8","Rxf8+","cxd3"],"y":["Qxd3","Rxf8"],"r":1908,"m":"Exposed king","n":0},{"f":"8/8/5kP1/p1p5/3nB3/1P6/8/6K1 b - - 0 1","s":["Nxb3","a4","Kxg7"],"y":["Bd5","g7"],"r":1908,"m":"Quiet move","n":0},{"f":"r3r3/2q1b1pk/p3P1Np/5Qp1/8/8/PPpp1P2/2R1R1K1 w - - 0 1","s":["Nf8+","Qh7+","Qh8+"],"y":["Kg8","Kxf8"],"r":1909,"m":"Mate in 3","n":3},{"f":"6k1/4pp2/p5pB/2p4n/3pP1Q1/P2P2qP/1r4P1/5RK1 w - - 0 1","s":["Qc8+","Rxf7+","Rxg7+","Qh8+","Rxg6+","Qg8+","Qxg3"],"y":["Kh7","Ng7","Kxh6","Kg5","Kxg6","Kf6"],"r":2000,"m":"Skewer","n":0},{"f":"2r1kb1r/ppq2ppp/2n1p3/3pPn2/N2P4/4BN2/PPR1QPPP/5RK1 b k - 0 1","s":["Ncxd4","Nxd4","Qxc2","Qc6"],"y":["Nxd4","Bxd4","Qb5+"],"r":2000,"m":"Fork","n":0},{"f":"8/Q7/2p2bpk/5n2/1P3r2/7P/4B1K1/8 b - - 0 1","s":["Bd4","Rf2+"],"y":["Qc7"],"r":2000,"m":"Winning tactic","n":0},{"f":"6k1/rb2rpb1/p3pR1p/1p2B3/3P2QN/1P6/P2N2PP/2q3K1 w - - 0 1","s":["Rf1","Qxg7+","Rxc1"],"y":["f5","Rxg7"],"r":2000,"m":"Defensive move","n":0},{"f":"4rk2/5p2/2R5/3P2R1/2p1r2p/2P4P/5KP1/8 b - - 0 1","s":["Rf4+","Re1+","Rff1","Ke7","Rxe5"],"y":["Kg1","Kh2","Rc8+","Re5+"],"r":2001,"m":"Quiet move","n":0},{"f":"4k3/7R/6p1/1p3r2/3p4/5PK1/1rP5/5R2 w - - 0 1","s":["Ra1","Ra8+","Ra7+"],"y":["Rf7","Ke7"],"r":2001,"m":"Quiet move","n":0},{"f":"5k2/6pp/2PP4/1p2p3/1n2b3/4q3/P3B1PP/2RQ1K2 b - - 0 1","s":["Nd3","Bxd3+","Qxd3+"],"y":["Bxd3","Qxd3"],"r":2001,"m":"Winning tactic","n":0},{"f":"1r3rk1/3b1pnp/3p2p1/4b3/2qBP3/6PP/3QN1BK/1R3R2 w - - 0 1","s":["Rxb8","Bxe5","Qxd7"],"y":["Rxb8","dxe5"],"r":2002,"m":"Discovered attack","n":0},{"f":"2k3r1/p1p2prp/2p5/2q5/2Q5/6Pb/PPPN1P1P/R3R1K1 b - - 0 1","s":["Rxg3+","Rxg3+","Qxf2","Kd7"],"y":["hxg3","Kh1","Re8+"],"r":2002,"m":"Pin","n":0},{"f":"2k1rb2/pp2r3/2pP2qp/6p1/8/1PB3QP/P1P1R1P1/2K1R3 b - - 0 1","s":["Rxe2","R2e6"],"y":["Qg4+"],"r":2002,"m":"Winning tactic","n":0},{"f":"5rk1/R5p1/4p2p/4n3/4N1PK/7P/P7/8 b - - 0 1","s":["Rf3","Rf4+","Rxe4"],"y":["g5","Kg3"],"r":2002,"m":"Fork","n":0},{"f":"r3r1k1/6bp/p1p3p1/3p4/3B4/2N2q1b/PPPQRP2/4R1K1 w - - 0 1","s":["Rxe8+","Rxe8+","Qg5","Bxg7"],"y":["Rxe8","Kf7","Kxe8"],"r":2003,"m":"Kingside attack","n":0},{"f":"4Q2k/6p1/2Bp3p/3P3q/6r1/1r6/3R1P2/4KR2 b - - 0 1","s":["Qxe8+","Re4+","Rb1+","Rb2+"],"y":["Bxe8","Re2","Kd2"],"r":2003,"m":"Fork","n":0},{"f":"r2k2nr/p3qBb1/1p1p3p/Q5p1/3n1B2/2N2R2/PPP3P1/R5K1 w - - 0 1","s":["Qd5","gxf3","Bxd6"],"y":["Nxf3+","Rc8"],"r":2004,"m":"Sacrifice","n":0},{"f":"3rr1k1/5p2/1p3qp1/2p2N1p/2Pb4/P4Q1P/5PP1/3R1RK1 w - - 0 1","s":["Nxd4","Rxd4"],"y":["Qxd4"],"r":2004,"m":"Winning tactic","n":0},{"f":"8/8/2p2kp1/ppn4p/1P1pq2P/P5P1/2P3K1/4QB2 w - - 0 1","s":["Qxe4","bxa5"],"y":["Nxe4"],"r":2005,"m":"Winning tactic","n":0},{"f":"r6k/p1n1q3/b6p/5QpP/8/PB2B3/1b3PP1/3RK2R b K - 0 1","s":["Bc3+","Rd8"],"y":["Rd2"],"r":2005,"m":"Pin","n":0},{"f":"rn1qk2r/pp3ppp/3bp1N1/3p4/3Pn3/3BB3/PPP2PPP/RN1Q1RK1 b kq - 0 1","s":["Bxh2+","hxg6"],"y":["Kh1"],"r":2006,"m":"Winning tactic","n":0},{"f":"r1b1kb1r/pp1p1ppp/2p2n2/1BP5/8/q7/P2B1PPP/1R1QK1NR w Kkq - 0 1","s":["Qe2+","Bb4","Rxb4"],"y":["Be7","Qxb4+"],"r":2006,"m":"Pin","n":0},{"f":"8/8/R2bpk2/2p1p2p/1pP1P2P/1P1N1P2/4K1r1/8 w - - 0 1","s":["Kf1","Rxd6","Ke1"],"y":["Rd2","Ke7"],"r":2006,"m":"Defensive move","n":0},{"f":"1r3rk1/1pR3pp/1p1p4/1q1np3/bP2N3/5N2/P2Q1PPP/R5K1 w - - 0 1","s":["Nxd6","Nxb5"],"y":["Nxc7"],"r":2100,"m":"Winning tactic","n":0},{"f":"6k1/pp4bp/3p2p1/1P6/Q1P1N3/3pqr1P/P2R2P1/5K2 w - - 0 1","s":["gxf3","Rf2","Kg2","Nxf2"],"y":["Bd4","Qc1+","Bxf2"],"r":2100,"m":"Quiet move","n":0},{"f":"4r3/pp2Pp1k/2qbN1pp/8/3Q4/1P4P1/P4P1P/4R1K1 b - - 0 1","s":["fxe6","Rxe7","Bxe7"],"y":["Rxe6","Rxe7+"],"r":2100,"m":"Winning tactic","n":0},{"f":"r2q1rk1/pp1n2pp/3b1p2/2ppN3/2PPbPP1/1Q2B3/PP2B2P/R4RK1 w - - 0 1","s":["Nxd7","dxc5","cxd6"],"y":["Qxd7","d4"],"r":2100,"m":"Winning tactic","n":0},{"f":"r1bq1rk1/1p3p1p/2p1p1N1/2Pn2bQ/1p1P4/P2B4/5PPP/R4RK1 w - - 0 1","s":["Ne7+","Qxg5+","Qh6"],"y":["Kg7","Kh8"],"r":2100,"m":"Interference","n":0},{"f":"1r6/6R1/3p4/KP1Rp3/2r1P3/2k2P2/8/8 b - - 0 1","s":["Ra4+","Ra8+","Rxa7+"],"y":["Kxa4","Ra7"],"r":2101,"m":"Mate in 3","n":3},{"f":"3r4/pk6/bpnbQ1r1/2q5/8/P1P1B3/2P3PP/R2R3K w - - 0 1","s":["Qf7+","Bxc5"],"y":["Ka8"],"r":2101,"m":"Fork","n":0},{"f":"2r1r1k1/pp3ppp/2n5/1B1p4/3q4/2Q5/PP3PPP/R3R1K1 w - - 0 1","s":["Rxe8+","Qxd4","Bxe8"],"y":["Rxe8","Nxd4"],"r":2101,"m":"Kingside attack","n":0},{"f":"1rb3k1/p1qnb1pp/8/1pp1Nr2/8/1P1P2QP/PB1N2B1/2R3K1 w - - 0 1","s":["Bd5+","Ng6+","Qxc7"],"y":["Kf8","hxg6"],"r":2101,"m":"Discovered attack","n":0},{"f":"3Q4/kp6/p1pP3q/8/4p1p1/3nP1P1/3K4/2R5 w - - 0 1","s":["Rb1","Qb6+"],"y":["Nc5"],"r":2101,"m":"Winning tactic","n":0},{"f":"3r1rk1/ppp2qbp/4p1p1/3Pnp2/2B1p3/1P2B2P/P1PQ1PP1/1K1R3R w - - 0 1","s":["dxe6","Qxd8"],"y":["Qf6"],"r":2101,"m":"Discovered attack","n":0},{"f":"4r1k1/1b1n1p1p/1p4p1/p2P4/P2P1qn1/B2B2N1/2Q2PPP/2R3K1 b - - 0 1","s":["Rc8","Bxc8","Kg7"],"y":["Qxc8+","Rxc8+"],"r":2101,"m":"Winning tactic","n":0},{"f":"r1b1n1k1/2q1prbp/p1p3p1/3p4/5P2/1BN5/PPP3PP/R1BQR1K1 w - - 0 1","s":["Nxd5","Qxd5","Qxa8"],"y":["cxd5","e6"],"r":2102,"m":"Winning tactic","n":0},{"f":"2rr1bk1/R4pp1/4p1bp/1q1n4/1p2N3/5QBP/1P3PP1/1B2R1K1 w - - 0 1","s":["Nd6","Bxg6"],"y":["Bxd6"],"r":2102,"m":"Fork","n":0},{"f":"2kr3r/pppb2pp/3b4/4q3/1P1n4/P2P1NP1/1B3PBP/R2Q1RK1 b - - 0 1","s":["Ne2+","Qxb2"],"y":["Kh1"],"r":2102,"m":"Discovered attack","n":0},{"f":"3k4/p1p3p1/8/2Q1pP2/2P3q1/1PN2nP1/PB2N2r/3K4 b - - 0 1","s":["Rh1+","Qxf5+","Qxe4+"],"y":["Kc2","Ne4"],"r":2103,"m":"Exposed king","n":0},{"f":"r3k1nr/pbp2p2/1pNbpq2/7p/3P2p1/3BPP2/PPQB2PP/R4RK1 b kq - 0 1","s":["Bxh2+","Qh4+","g3","Qh2+","Qh1+","Qxg2+","Qxf3+","Qxc6","Bxc6"],"y":["Kxh2","Kg1","Rfe1","Kf1","Ke2","Kd1","Be2","Qxc6+"],"r":2103,"m":"Deflection","n":0},{"f":"3r3r/Qbk5/Rp1p3p/1P1qpp2/6p1/2P2NP1/3N1PP1/5RK1 b - - 0 1","s":["Qxb5","Ra8","Qxc4","Kxb7"],"y":["Ra4","Rc4+","Qxb7+"],"r":2104,"m":"Trapped piece","n":0},{"f":"3r4/b4r1k/p1p4p/1p2Bp2/1P1p1P2/P2B4/2P2P1P/6RK w - - 0 1","s":["Bxf5+","Rg7+","Rd7+","Rxd8+"],"y":["Rxf5","Kh8","Kg8"],"r":2104,"m":"Fork","n":0},{"f":"8/3k4/1p1n4/p2N4/2P1p3/PP2K3/8/8 w - - 0 1","s":["Nxb6+","Na4"],"y":["Kc6"],"r":2105,"m":"Defensive move","n":0},{"f":"2r1r1k1/4b1pp/p2pp3/1p4PP/4P1Q1/PNN1pP2/KPP4R/5q2 w - - 0 1","s":["Qxe6+","h6","Qf7"],"y":["Kh8","g6"],"r":2201,"m":"Kingside attack","n":0},{"f":"6k1/5pb1/p1p1p1pp/P1B2q2/2bP1Q2/1rP1RN1P/5PP1/6K1 w - - 0 1","s":["Qxf5","Nd2","Rf3"],"y":["gxf5","f4"],"r":2202,"m":"Fork","n":0},{"f":"r2q1rk1/2p2p1p/p1n2Q2/1pbNP1N1/3n2P1/7P/PPBB4/R3K2R b KQ - 0 1","s":["Nxc2+","Qxd5"],"y":["Kd1"],"r":2203,"m":"Fork","n":0},{"f":"2k2r1r/pp2q3/2p1b3/7p/1P1pPBn1/3B4/P2Q2PP/1RR4K b - - 0 1","s":["Rxf4","Rf8","Qxf8"],"y":["Qxf4","Qxf8+"],"r":2204,"m":"Clearance","n":0},{"f":"4r2k/6bp/p1bp2p1/1p2q3/1P2Pr2/2N2QP1/1BP2n1P/2K1R2R w - - 0 1","s":["gxf4","Nd1"],"y":["Qd4"],"r":2206,"m":"Winning tactic","n":0},{"f":"r2r2k1/4Rp1p/5Qp1/p7/8/2P4P/q4PP1/4R1K1 w - a6 0 1","s":["h4","R1e5"],"y":["Qd5"],"r":2207,"m":"Quiet move","n":0},{"f":"Q7/8/3B4/2p5/1rkn4/K7/8/8 b - - 0 1","s":["Nb5+","Nc3+","Rb1+"],"y":["Ka2","Ka1"],"r":2211,"m":"Arabian mate","n":3},{"f":"8/4B3/2k5/2P1Kp2/3P1Pp1/4n3/8/8 b - - 0 1","s":["g3","Kd7"],"y":["d5+"],"r":2211,"m":"Defensive move","n":0},{"f":"5rkr/1QN5/4R3/p1P5/P2p4/1B1q3P/1P4P1/6K1 b - - 0 1","s":["Rf1+","Rxh3+","Rf2+","Rxg2+","Qxb3"],"y":["Kh2","gxh3","Qg2+","Kxg2"],"r":2213,"m":"Sacrifice","n":0},{"f":"8/1k6/1P1Kp3/5p1p/6p1/5P1P/5P2/8 w - - 0 1","s":["fxg4","h4"],"y":["fxg4"],"r":2214,"m":"Defensive move","n":0},{"f":"r2Q1b1N/6pp/p1kn2q1/2pp4/5B2/2P2NP1/PP5P/R2K4 b - - 0 1","s":["Qd3+","Qe4+"],"y":["Ke1"],"r":2216,"m":"Fork","n":0},{"f":"8/P1k5/5R2/1P4p1/7p/7P/6PK/rr3B2 w - - 0 1","s":["Ra6","b6+","Rxa1","b7"],"y":["Rxf1","Kd7","Rxa1"],"r":2220,"m":"Sacrifice","n":0},{"f":"r4rk1/p1p1b1pp/8/q3p1B1/1nQpP1P1/1P3N1P/2P2P2/1K1R3R b - - 0 1","s":["Kh8","Qa2+","Rxf3"],"y":["Bxe7","Kc1"],"r":2221,"m":"Sacrifice","n":0},{"f":"2r1kb1r/1p3pp1/pq2pnp1/3p4/1n1P1B2/P1N2N1P/2P2PP1/R2QK2R w KQk - 0 1","s":["Na4","axb4"],"y":["Qb5"],"r":2222,"m":"Winning tactic","n":0},{"f":"1r2rknQ/pR3p2/2pq4/3p1BP1/3P4/4P3/P7/1K5R w - - 0 1","s":["Qg7+","Rh7+","Rxf7+"],"y":["Kxg7","Kf8"],"r":2222,"m":"Mate in 3","n":3},{"f":"4Rbk1/p4p1p/6p1/8/1PQ1N3/2P4P/2rq1PP1/6K1 b - - 0 1","s":["Rc1+","Qf4+","Qf3","Kxf8","Kg8"],"y":["Kh2","g3","Rxf8+","Qc5+"],"r":2223,"m":"Defensive move","n":0},{"f":"8/8/5P2/1kr4R/8/6K1/8/8 b - - 0 1","s":["Rxh5","Rh8","Kc6"],"y":["Kg4","Kf5"],"r":2223,"m":"Quiet move","n":0},{"f":"r5k1/pb2Brpp/1p2p3/4n3/3RP2P/2P5/PPQ1BqP1/2K2R2 b - - 0 1","s":["Qe3+","Qxd2+"],"y":["Qd2"],"r":2223,"m":"Queenside attack","n":0},{"f":"5rk1/2p3b1/3pq3/P4rB1/1PP1p1Q1/7P/5P1K/2R2R2 b - - 0 1","s":["Qe5+","exf3+"],"y":["f4"],"r":2225,"m":"Discovered attack","n":0},{"f":"7Q/p3nkpp/3p2q1/3P4/4P3/B1r2B1b/P4PPP/R4RK1 b - - 0 1","s":["Rxf3","Rxa3"],"y":["g3"],"r":2226,"m":"Pin","n":0},{"f":"4r1k1/pp3p1p/2n2p2/2b5/N7/7Q/P1B1qPPP/3R2K1 w - - 0 1","s":["Qxh7+","Qh6+","Nxc5"],"y":["Kf8","Ke7"],"r":2300,"m":"Winning tactic","n":0},{"f":"4Qrk1/pp4p1/4b2p/4N3/1P3q2/P7/6PP/2R4K w - - 0 1","s":["Qxe6+","Rg1"],"y":["Kh7"],"r":2300,"m":"Defensive move","n":0},{"f":"1r4k1/1r4b1/2p5/q1PppQNp/P2P2p1/4P1PP/5KP1/RR6 b - - 0 1","s":["Rf8","Bxf8"],"y":["Qxf8+"],"r":2301,"m":"Pin","n":0},{"f":"1r4k1/p4p1p/6p1/3rb3/K7/2PpB3/1P1R1PPP/3R4 b - - 0 1","s":["Rd6","Bxc3","Ra6+"],"y":["b4","Bc5"],"r":2302,"m":"Quiet move","n":0},{"f":"1k1nRb1r/ppp2Npp/3q4/8/2P3Br/3P4/PP3P2/R1BQ2K1 b - - 0 1","s":["Qh2+","Bc5"],"y":["Kf1"],"r":2304,"m":"Clearance","n":0},{"f":"8/5r1k/1p5b/6p1/8/pP1PQ1P1/q4PK1/7R w - - 0 1","s":["Qxb6","Qxf2","Kxf2"],"y":["Qxf2+","Rxf2+"],"r":2304,"m":"Winning tactic","n":0},{"f":"1k6/pp5P/2p5/8/5P2/2P3bq/PP6/3R1RK1 w - - 0 1","s":["Rd8+","h8=Q","Kf2"],"y":["Kc7","Bh2+"],"r":2305,"m":"Promotion","n":0},{"f":"2r5/pp2kp2/3p4/3P4/3pP2p/3P2rP/PP3R2/5R1K w - - 0 1","s":["Rxf7+","Rf8+","Rc1+"],"y":["Kd8","Kc7"],"r":2308,"m":"Winning tactic","n":0},{"f":"8/8/4pk1p/pp1r1pp1/3R4/P1P2PP1/1P2K2P/8 w - - 0 1","s":["Rxd5","Ke3","f4+"],"y":["exd5","Ke5"],"r":2311,"m":"Winning tactic","n":0},{"f":"4r1k1/p4ppp/bqp2n2/3p4/3P4/2Q5/PP3PPP/RNB1N1K1 b - - 0 1","s":["Qb5","Qxd3"],"y":["Nd3"],"r":2312,"m":"Winning tactic","n":0},{"f":"r1bqkr2/1pp3pN/p1np4/4pp2/2B1n3/P1NPK2P/1PP3P1/R1BQ3R b q - 0 1","s":["f4+","Bf5+","Qh4"],"y":["Kxe4","Kf3"],"r":2313,"m":"Fork","n":0},{"f":"3r1rk1/pp3p1p/5p2/1q3B1Q/8/1P2p3/P4PPP/2R2K2 w - - 0 1","s":["Kg1","Bxh7+","Qxb5"],"y":["Rfe8","Kg7"],"r":2313,"m":"Discovered attack","n":0},{"f":"8/5k2/7p/p1P1bPpP/Pp2P3/1P1p1K2/5B2/8 b - - 0 1","s":["g4+","Bd4+","Bxf2"],"y":["Ke3","Kxd3"],"r":2315,"m":"Skewer","n":0},{"f":"6k1/5p2/3bbq2/p1Np2pp/3Pn3/P3PN1P/4BPP1/2Q3K1 b - - 0 1","s":["Bxc5","g4"],"y":["dxc5"],"r":2315,"m":"Winning tactic","n":0},{"f":"6k1/5p2/4p2p/3pPP2/1R5P/2r5/2B5/2b2K2 w - - 0 1","s":["Rb8+","fxe6+","e7"],"y":["Kh7","Rxc2"],"r":2317,"m":"Discovered attack","n":0},{"f":"5r1k/2p3p1/p1pp3p/8/Pb1PP3/1Q2KP2/1P2R2q/R1B5 b - - 0 1","s":["Rxf3+","Qh3+","Qxb3"],"y":["Kxf3","Kf2"],"r":2317,"m":"Skewer","n":0},{"f":"r1bq2k1/3p1N2/p1p1pbn1/2p2p2/4PP1Q/2NP4/PPP4P/R1B2RK1 b - - 0 1","s":["Bd4+","Bxf2+","Kxf7"],"y":["Qf2","Rxf2"],"r":2319,"m":"Kingside attack","n":0},{"f":"8/6p1/8/pp2k1p1/2p2p2/2P2PPP/PP3K2/8 b - - 0 1","s":["fxg3+","Kf5"],"y":["Kxg3"],"r":2322,"m":"Defensive move","n":0},{"f":"R4r1k/6q1/1p1p3p/1P4NQ/2Pppr2/3n4/6PP/R6K w - - 0 1","s":["Ne6","Rxa8+"],"y":["Rxa8"],"r":2326,"m":"Fork","n":0},{"f":"r4q1k/2bn2p1/2p3pp/1pP5/1P1B2P1/1Q1P1B1P/5P2/4RRK1 b - - 0 1","s":["Qf4","Kh7","Nxe5","Bxe5","Qxf3"],"y":["Bxg7+","Re5","Bxe5","Re1"],"r":2331,"m":"Fork","n":0},{"f":"r2qr2k/1pp2Qp1/1b4np/pP2P3/P4n2/B1N2N1P/5PP1/R3R1K1 b - - 0 1","s":["Qd3","Nxe2+","Qxe2"],"y":["Ne2","Rxe2"],"r":2400,"m":"Kingside attack","n":0},{"f":"2r3k1/p1Rb1ppp/2n1pn2/8/8/2P3P1/q4PBP/1rNQK2R w K - 0 1","s":["Rxc8+","Nxa2","Kxd1"],"y":["Bxc8","Rxd1+"],"r":2403,"m":"Winning tactic","n":0},{"f":"5b1k/1p5p/p1n1QPp1/8/5R2/P2q2PK/2r4P/5R2 w - - 0 1","s":["Qf7","Rd1","Rd7"],"y":["Qd8","Qc8+"],"r":2403,"m":"Defensive move","n":0},{"f":"r3k2r/1bq2ppp/p2p1n2/1p2p1NQ/3nP3/1BN4P/PP3PP1/R2R2K1 w kq - 0 1","s":["Qxf7+","Nxf7"],"y":["Qxf7"],"r":2404,"m":"f2/f7 attack","n":0},{"f":"4k3/7r/p1PPK3/4P2p/8/1p6/7P/8 w - - 0 1","s":["d7+","Kd6","e6","Kxe6","Ke7"],"y":["Kd8","Rh6+","Rxe6+","Kc7"],"r":2405,"m":"Defensive move","n":0},{"f":"8/8/3k4/8/p3r3/P2K4/1P6/8 w - - 0 1","s":["Kxe4","Ke5","Kd6"],"y":["Kc5","Kc4"],"r":2405,"m":"Zugzwang","n":0},{"f":"4Q3/5p1k/p2p2pp/1prq1P2/8/1P6/P5PP/5RK1 w - - 0 1","s":["fxg6+","Qg8+","h3","Kh1"],"y":["Kxg6","Kh5","Qd4+"],"r":2407,"m":"Attraction","n":0},{"f":"8/7p/1KR3k1/8/5p2/5n2/8/8 b - - 0 1","s":["Kf5","h5"],"y":["Kc5"],"r":2408,"m":"Defensive move","n":0},{"f":"r3r1k1/p4ppp/8/3Q4/3P4/Ppp2N2/2b2PPP/K2R3R b - - 0 1","s":["b2+","Bxd1","c2"],"y":["Ka2","Rxd1"],"r":2410,"m":"Winning tactic","n":0},{"f":"8/6pp/8/3kP3/1p1P2P1/1rpK3P/4R3/8 w - - 0 1","s":["e6","Kxc2","Kd2"],"y":["c2+","Rc3+"],"r":2415,"m":"Winning tactic","n":0},{"f":"3q3k/8/3PQ2p/p3n1r1/P1P4b/2N1p2P/1r6/R5RK w - - 0 1","s":["Qxh6+","Qxh4","Kxh2","Kh1","Rxg5+"],"y":["Kg8","Rh2+","Nf3+","Nxh4"],"r":2415,"m":"Fork","n":0},{"f":"r2r2k1/ppq1bppp/4pn2/6B1/3P4/2N1Q3/nP1RNPPP/5RK1 w - - 0 1","s":["Bf4","b3"],"y":["Qc4"],"r":2418,"m":"Winning tactic","n":0},{"f":"r2q1rk1/pbp1bp2/1p2pn1Q/5BN1/8/P1N5/1PP3PP/R4RK1 b - - 0 1","s":["Qd4+","exf5"],"y":["Kh1"],"r":2420,"m":"Winning tactic","n":0},{"f":"3k2r1/1p4NR/p7/P2pPP2/1r4p1/8/6K1/8 w - - 0 1","s":["f6","f7","Ne6"],"y":["Kc8","Rf8"],"r":2421,"m":"Winning tactic","n":0},{"f":"3k3r/pp1P1ppp/r1p2q2/1N3n2/6n1/8/PP3PPP/2RQR1K1 w - - 0 1","s":["Qxg4","Rc8+","Rxh8"],"y":["cxb5","Kxd7"],"r":2423,"m":"Skewer","n":0},{"f":"8/5k1p/5p2/3pbP2/7P/2B2K2/1P6/8 b - - 0 1","s":["Bxc3","h5"],"y":["bxc3"],"r":2425,"m":"Defensive move","n":0},{"f":"8/6k1/6Pp/p1p1pP2/PpPp2K1/1P1P4/8/8 b - - 0 1","s":["e4","d3","h5","h4"],"y":["dxe4","Kf3","Ke3"],"r":2425,"m":"Quiet move","n":0},{"f":"4k3/5P1r/4P1N1/p5KP/8/p1P5/2P4P/8 b - - 0 1","s":["Rxf7","Kxf7","Kg8","Kh7"],"y":["exf7+","h6","Ne5"],"r":2426,"m":"Sacrifice","n":0},{"f":"8/7p/1pk3p1/p2p1pP1/P4P1P/1PPK4/8/8 w - - 0 1","s":["Kd4","c4","bxc4","Ke5","Kf6","Kg7"],"y":["Kd6","dxc4","Kc6","Kc5","Kxc4"],"r":2429,"m":"Zugzwang","n":0},{"f":"8/8/1R5P/2p5/p1k1pP2/4P3/np1K4/8 b - - 0 1","s":["Nb4","Kxb4","Ka3","Ka2"],"y":["Rxb4+","Kc2","h7"],"r":2433,"m":"Quiet move","n":0},{"f":"5k2/1p6/8/4p2B/1R2Pp1p/3r2pP/4K3/8 b - - 0 1","s":["Re3+","f3","Rxf3+"],"y":["Kf1","Bxf3"],"r":2501,"m":"Winning tactic","n":0},{"f":"r1b2rk1/pp2bpp1/1qpp1n1p/2n1p3/1P2P3/P1NP1N2/1BP1BPPP/R2Q1RK1 w - - 0 1","s":["bxc5","Qd2"],"y":["Qxb2"],"r":2508,"m":"Winning tactic","n":0},{"f":"r2q1rk1/pp3pb1/2p1p2P/3nN3/3Pn3/1Q6/PPP1N3/1K4R1 w - - 0 1","s":["Rxg7+","Qxb7"],"y":["Kh8"],"r":2510,"m":"Winning tactic","n":0},{"f":"8/7p/2k1p1p1/K1p5/5PP1/1P5P/P7/8 b - - 0 1","s":["g5","exf5"],"y":["f5"],"r":2512,"m":"Winning tactic","n":0},{"f":"1r3r2/6qp/4B2k/p2N2P1/P4bP1/1P2Q3/2P5/2KR4 b - - 0 1","s":["Bxg5","Kg6","Rxf5","Kf7","Bxe3+"],"y":["Rh1+","Bf5+","gxf5+","f6"],"r":2513,"m":"Pin","n":0},{"f":"8/3k4/8/pp1PPK2/6Pb/8/P7/8 w - - 0 1","s":["g5","e6+","d6"],"y":["a4","Ke8"],"r":2515,"m":"Quiet move","n":0},{"f":"5r1k/p2q2pb/3p4/2r1NPp1/P1p1Q3/2P3PP/5RK1/3R4 b - - 0 1","s":["Qe8","Bxg6","Bxe8"],"y":["Ng6+","Qxe8"],"r":2516,"m":"Winning tactic","n":0},{"f":"1r4k1/2pr1ppp/1pP5/pQ6/8/q7/5PPP/3R2K1 w - - 0 1","s":["cxd7","Kf1"],"y":["Qe7"],"r":2521,"m":"Defensive move","n":0},{"f":"8/6p1/3k1r2/1R6/6Kp/7P/5P2/8 w - - 0 1","s":["Rb6+","Rxf6","Kxh4","Kh5"],"y":["Ke7","Kxf6","g5+"],"r":2522,"m":"Winning tactic","n":0},{"f":"r3k2r/ppnq2pp/2pb1p2/3p1n2/3P4/P2Q1N2/1PPBNPPP/R3R1K1 w kq - 0 1","s":["Ng3+","Nf5","Nxd6"],"y":["Ne7","O-O"],"r":2530,"m":"Discovered attack","n":0},{"f":"2r2r1k/1p3p2/p4P1p/6q1/P7/2P4Q/5RP1/4R1K1 w - - 0 1","s":["Re5","Rh5","Rff5","Rhg5","Rxf6"],"y":["Qg6","Kh7","Rc6","Qxf6"],"r":2536,"m":"Pin","n":0},{"f":"r4rk1/2qn1ppp/b7/2p1p1N1/1p6/1B6/1PP1QPPP/3R1RK1 w - - 0 1","s":["Rxd7","Qe4","Bxf7+","Qxa8+"],"y":["Qxd7","g6","Rxf7"],"r":2537,"m":"Deflection","n":0},{"f":"8/5P1P/1p4Kr/8/6P1/8/2p5/k7 w - - 0 1","s":["Kxh6","g5","Kg7"],"y":["c1=Q+","Qc6+"],"r":2538,"m":"Defensive move","n":0},{"f":"6r1/pp1qbpk1/8/2pPp1r1/2P1Pp2/P1N2QpR/3B2K1/R7 b - - 0 1","s":["Qxh3+","g2"],"y":["Kxh3"],"r":2541,"m":"Sacrifice","n":0},{"f":"3k4/3r2pp/3P1p2/2PK1P2/1P6/7P/8/8 w - - 0 1","s":["c6","b5","Kc4","b6"],"y":["Ra7","Ra5","Ra2"],"r":2542,"m":"Quiet move","n":0},{"f":"r7/5kp1/p3pnp1/1pb2r2/3nb1p1/2Q5/PPPBNP1P/2KRR3 b - - 0 1","s":["Nxc2","Nb4","Nxa2+","Nxc3+"],"y":["Ng3","Nxe4","Kb1"],"r":2558,"m":"Fork","n":0},{"f":"r4rk1/p4pp1/4b2p/2bp4/5B1Q/6R1/PP2qPPP/5RK1 w - - 0 1","s":["Rxg7+","Bxh6+","Bxf8+","Bxc5"],"y":["Kxg7","Kh7","Kg8"],"r":2559,"m":"Skewer","n":0},{"f":"2R5/8/8/1p6/nk6/1p6/8/1K6 b - - 0 1","s":["Ka3","b2","Kb3","Kxa4","Kb4"],"y":["Rc6","Ra6","Rxa4","Kxb2"],"r":2560,"m":"Zugzwang","n":0},{"f":"8/6rk/6p1/1R5p/2pQ1P2/2Pb2P1/qP4PK/8 w - - 0 1","s":["Qd8","Rb8","Qxb8"],"y":["Qa7","Qxb8"],"r":2567,"m":"Quiet move","n":0},{"f":"6k1/p3b2p/1p1pP3/2P3P1/2np3B/P6P/3Q3K/8 b - - 0 1","s":["Nxd2","d5","Bd6+"],"y":["c6","g6"],"r":2579,"m":"Clearance","n":0},{"f":"2kr3r/bpp2pp1/2pqbn2/P6p/1N2P3/2PP3P/4BPP1/R1BQK2R b KQ - 0 1","s":["Nxe4","Qc5","Rxd1"],"y":["dxe4","O-O"],"r":2600,"m":"Discovered attack","n":0},{"f":"8/8/5pk1/8/4p1pR/2K4p/1P6/8 b - - 0 1","s":["f5","Kg5","Kf4","g3","Kf3"],"y":["Kd2","Rh8","b4","Rh4+"],"r":2601,"m":"Quiet move","n":0},{"f":"r1bq1r2/1p4kp/4p1p1/1NpPp1P1/2P1P3/pPQ4B/P7/2KR3n w - - 0 1","s":["Qxe5+","dxe6","Rxh1","Qxg7+"],"y":["Kg8","Qe7","Qg7"],"r":2603,"m":"Winning tactic","n":0},{"f":"3r2rk/p3b2p/2n2p2/2pnNPP1/1p1p3q/3P1Q2/PPP3B1/R1B1R1K1 w - - 0 1","s":["Nf7+","Re4"],"y":["Kg7"],"r":2617,"m":"Fork","n":0},{"f":"2k5/2p2p2/P1N3p1/1PK2n2/8/7p/2P2P2/8 w - - 0 1","s":["b6","Ne7+","a7"],"y":["Nd6","Kd7"],"r":2624,"m":"Winning tactic","n":0},{"f":"3r2k1/2r2p2/4p2p/4N1pQ/1p3P2/4P3/np3P1P/2q2BRK w - - 0 1","s":["Qxh6","Qxg5+"],"y":["b1=Q"],"r":2627,"m":"Pin","n":0},{"f":"r3r1k1/3b1p2/pp1q2pp/8/4B3/1NP3PP/PP5K/RQB5 b - - 0 1","s":["Qe7","Qxe4","Rxe4"],"y":["Bxh6","Qxe4"],"r":2643,"m":"Winning tactic","n":0},{"f":"6k1/pp3p1p/1qp3p1/8/8/2bB1Q1P/Pr3PP1/4R1K1 w - - 0 1","s":["Bc4","Re8+","Qxc3+"],"y":["Rxf2","Kg7"],"r":2656,"m":"Winning tactic","n":0},{"f":"r3r1k1/p4ppp/2p2n2/1p6/3P1qb1/2NQ2R1/PPB2PP1/R1B3K1 b - - 0 1","s":["Re1+","Rxc1","Qh6+","Qxc1+"],"y":["Kh2","Rxc1","Kg1"],"r":2674,"m":"Fork","n":0},{"f":"1Q6/6pk/6qp/1p6/2p1P1P1/5P2/5K1P/8 b - - 0 1","s":["Qc6","c3","Qc8"],"y":["e5","Qd6"],"r":2674,"m":"Winning tactic","n":0},{"f":"1b5k/ppq2p1b/2p1pp1p/2Q5/2N1PP2/PPN3rP/2P3BK/3R4 b - - 0 1","s":["Qxf4","Rg5+","Bxf4+","Rxc5"],"y":["Ne2","Nxf4","Kg1"],"r":2675,"m":"Discovered attack","n":0},{"f":"8/5p1p/p4k2/1p1K2p1/2pP2P1/2P4P/P7/8 w - - 0 1","s":["a3","Kc5"],"y":["a5"],"r":2675,"m":"Quiet move","n":0},{"f":"rn5Q/pp2np2/1k1B4/6N1/6b1/8/PPP1q3/2KR4 w - - 0 1","s":["Qd4+","Qc3+","Re1"],"y":["Kc6","Kd7"],"r":2690,"m":"Exposed king","n":0},{"f":"8/3r2kp/P5p1/8/4P3/R2n1R1P/3r1PP1/5K2 b - - 0 1","s":["Rd1+","Nc1+","g5"],"y":["Ke2","Ke3"],"r":2697,"m":"Defensive move","n":0},{"f":"8/4k3/4pppp/1r2P2P/1P3PK1/8/8/1R6 w - - 0 1","s":["hxg6","Kh5","Kxh6","g7","Rf1"],"y":["fxe5","exf4+","f3","Kf7"],"r":2704,"m":"Winning tactic","n":0},{"f":"r2k3r/1bpp1Qpn/p1n1P2p/1pb5/3N3q/1B5P/PPP2PP1/RNB1R1K1 b - - 0 1","s":["Ne7","Qxf4","Bxd4"],"y":["Qf4","Bxf4"],"r":2707,"m":"Remove the defender","n":0},{"f":"6k1/6p1/6Qp/p3r3/2P3R1/1P2p2P/P5PK/q7 b - - 0 1","s":["Re7","Qb1","Rxe8"],"y":["Re4","Qe8+"],"r":2718,"m":"Quiet move","n":0},{"f":"1kq1r2r/p1p2pp1/1pPb4/3P4/Q1B2nbp/4B3/P2N1PPP/1R2R1K1 w - - 0 1","s":["Ba6","Bxb6","Rxe1","c7+","Re8+","Qxe8+","Bxc8"],"y":["Qf5","Rxe1+","cxb6","Bxc7","Rxe8","Qc8"],"r":2719,"m":"Sacrifice","n":0},{"f":"r3r1k1/p4p1p/1p4pB/4p3/3nP2Q/P7/2q2PPP/R4RK1 w - - 0 1","s":["Rac1","Qf6","Rc7"],"y":["Qe2","Ne6"],"r":2723,"m":"Winning tactic","n":0},{"f":"1k3r2/ppp2r1p/1b1pQP1p/1q6/3P3P/2P3R1/P5P1/5R1K w - - 0 1","s":["Qxf7","Kh2","Qe6"],"y":["Qxf1+","Rc8"],"r":2730,"m":"Winning tactic","n":0},{"f":"2r1k2r/1b1q2bp/p5p1/2p1PnB1/2QPN3/8/PP4PP/R4RK1 w k - 0 1","s":["Nd6+","exd6","Qxd4","Rae1+","Rxe6+"],"y":["Nxd6","Bxd4+","cxd4","Qe6"],"r":2738,"m":"Fork","n":0},{"f":"2kr3r/ppp1qppp/5n2/4P1B1/2B3b1/8/P1PN2PP/Q4RK1 w - - 0 1","s":["Nb3","exf6"],"y":["Qb4"],"r":2766,"m":"Quiet move","n":0},{"f":"r4r2/pp1q1p2/2p1n1kB/4Pp2/2Pb3Q/P7/6PP/3R3K w - - 0 1","s":["Bxf8","Rxd4","Qxd4"],"y":["Nxf8","Qxd4"],"r":2769,"m":"Winning tactic","n":0},{"f":"4k3/1K3p2/4pPp1/1P2N2p/5P2/8/7P/1r6 w - - 0 1","s":["b6","Kc6","Nc4","b7","Kb5","b8=Q"],"y":["Rh1","Rxh2","Rc2","Rxc4+","Kd7"],"r":2786,"m":"Sacrifice","n":0},{"f":"r1r2k2/ppq3bQ/4p2p/4n3/3p4/2P5/PBB2PPP/4R1K1 w - - 0 1","s":["Ba3+","Bd1","Bh5+","Qe4"],"y":["Kf7","Rh8","Kf6"],"r":2793,"m":"Quiet move","n":0},{"f":"2k4r/p1p3q1/P4p2/2p5/Q1NP4/2P2K1P/6p1/6R1 b - - 0 1","s":["Rxh3+","Qg6","Kd8","Qxe8+","Kxe8","Rxc3"],"y":["Ke2","Nd6+","Qe8+","Nxe8","Rxg2"],"r":2794,"m":"Quiet move","n":0},{"f":"8/8/8/P1K1p3/5k1p/5b2/5P2/5B2 b - - 0 1","s":["Ba8","e4","Kg4","h3","e3","exf2","Kg3","f1=Q","Qxf3"],"y":["Kd6","Bg2","a6","Bh1","Bxa8","Bf3+","a7","a8=Q"],"r":2799,"m":"Promotion","n":0}];
const _pzSide=f=>f.split(' ')[1]==='b'?'Black':'White';
const _pzGoal=(f,n)=>_pzSide(f)+' to move — '+(n>0?('mate in '+n):'find the best move');
const _pzLevel=r=>r<1000?'Easy':r<1400?'Medium':r<1800?'Hard':'Expert';
const _pzHint=(n,m)=>n>0?('It\'s mate in '+n+' — start with the most forcing check.'):('Find the forcing move — a check, capture, or strong threat. ('+m+')');
const _pzExp=(n,m)=>(n>0?('Mate in '+n):m)+' — nicely done.';
const PZ_GEN=PZGEN_RAW.map((p,i)=>({id:'g'+i,fen:p.f,sol:p.s,reply:p.y,rating:p.r,goal:_pzGoal(p.f,p.n),motif:p.m,level:_pzLevel(p.r),hint:_pzHint(p.n,p.m),explain:_pzExp(p.n,p.m)}));
// Hand-built curated puzzles (famous traps + teaching tactics) get ids + ratings.
const PZ_CUR=PUZZLES.map((p,i)=>{const base=p.level==='Easy'?760:p.level==='Medium'?1240:1660;const bump=/trap|smother/i.test(p.motif)?150:0;return {...p,id:'c'+i,rating:Math.min(2050,base+bump+(i%5)*13)};});
const PZ=PZ_CUR.concat(PZ_GEN).sort((a,b)=>a.rating-b.rating);
// 8 ranks as contiguous difficulty slices → always populated, always ramping.
const _RANKS=[['Novice','🌱'],['Apprentice','♟️'],['Student','♞'],['Adept','♝'],['Skilled','♜'],['Expert','♛'],['Master','👑'],['Grandmaster','🏆']];
const PZ_TIERS=(()=>{const N=PZ.length,K=_RANKS.length,out=[];for(let k=0;k<K;k++){const a=Math.round(N*k/K),b=Math.round(N*(k+1)/K);const sl=PZ.slice(a,b);out.push({name:_RANKS[k][0],icon:_RANKS[k][1],start:a,end:b,count:sl.length,need:Math.max(1,Math.min(sl.length,10)),lo:sl.length?sl[0].rating:0,hi:sl.length?sl[sl.length-1].rating:0,ids:sl.map(p=>p.id)});}return out;})();
const PZ_TIER_OF={}; PZ_TIERS.forEach((t,ti)=>t.ids.forEach(id=>{PZ_TIER_OF[id]=ti;}));
// Endgame & theory lessons. Same shape as openings but each starts from a custom position (fen).
// Validated every build with python-chess: every fen is a LEGAL position (side-not-to-move is NOT in check), every line is legal from its fen, and mating lines end in checkmate. selectOpening also guards this at load.
const ENDGAMES=[
  { name:"King & Queen Mate", eco:"K+Q", side:"w", cat:"♚ Endgames & Theory",
    fen:"5k2/3Q4/5K2/8/8/8/8/8 w - - 0 1",
    idea:"The fastest checkmate of all: queen and king. Box the lone king against the edge, keep the queen protected, and bring your own king up to finish.",
    plans:"Keep the queen a knight's-move from the enemy king so you never stalemate it, walk it to the edge, then escort with your king.",
    line:["Qe7+","Kg8","Qg7#"],
    notes:[
      "Bring the queen in close with check. The king on f6 guards e7, so the queen can't be captured — and Black is shoved toward the corner.",
      "Forced. Every other square around the king is covered, so it must step to g8.",
      "Your king guards the queen one last time and she delivers mate. The whole method: corner the king, keep the queen safe, bring your king up."
    ] },
  { name:"Two-Rook Checkmate", eco:"2R", side:"w", cat:"♚ Endgames & Theory",
    fen:"8/8/8/3k4/R7/8/8/6KR w - - 0 1",
    idea:"Two rooks mate a lone king with no help at all — the 'ladder' or 'lawnmower'. One rook checks while the other walks the king to the edge.",
    plans:"Check with one rook; the other fences off the rank behind the king. Then leapfrog them rank by rank until the king runs out of board.",
    line:["Rh5+","Kd6","Ra6+","Kd7","Rh7+","Kd8","Ra8#"],
    notes:[
      "The lawnmower begins. This rook checks along the 5th rank; the a4-rook fences off the 4th, so the king can only retreat.",
      "The king steps back — it can't reach either rook to attack it.",
      "Now the other rook checks one rank higher, driving the king further toward the edge.",
      "Forced backward again. Notice the rooks never get in each other's way.",
      "Leapfrog: this rook jumps ahead to check while its partner guards the rank below.",
      "The king reaches the last rank with nowhere left to run.",
      "Checkmate, and your king never even moved. Two rooks do the whole job alone."
    ] },
  { name:"King & Rook Mate", eco:"K+R", side:"w", cat:"♚ Endgames & Theory",
    fen:"7k/R7/5K2/8/8/8/8/8 w - - 0 1",
    idea:"King and rook vs king — the most important basic mate to know. The rook can't do it alone, so your king takes away escape squares while the rook delivers.",
    plans:"Walk your king up to take squares from the enemy king, then check with the rook to pin it against the edge.",
    line:["Kg6","Kg8","Ra8#"],
    notes:[
      "A rook needs the king's help. Kg6 quietly steals g7 and h7 from the enemy king — now it has almost nowhere to go.",
      "Forced to g8: it's the only square your king hasn't covered.",
      "The rook mates along the back rank while your king blankets every escape. This is the textbook king-and-rook checkmate."
    ] },
  { name:"Two Bishops Mate", eco:"2B", side:"w", cat:"♚ Endgames & Theory",
    fen:"6k1/4B3/6K1/8/4B3/8/8/8 w - - 0 1",
    idea:"Two bishops and a king can force mate — but only in a corner. Work the bishops side by side to build a wall, herd the lone king to the corner, and bring your own king up to finish.",
    plans:"Keep the bishops on adjacent diagonals so they fence the enemy king toward a corner; march your king up for support; then mate with both bishops raking the corner squares.",
    line:["Bd5+","Kh8","Bf6#"],
    notes:["The light-squared bishop checks and shoves the king toward the h8 corner.","Forced: f8 is covered by the e7-bishop, so the king is herded into the corner.","The dark-squared bishop mates along the long diagonal, the light bishop guards g8, and your king blankets g7 and h7. The whole two-bishop method in miniature."] },
  { name:"Smothered Mate", eco:"N#", side:"w", cat:"♚ Endgames & Theory",
    fen:"5r1k/6pp/7N/8/8/1Q6/8/6K1 w - - 0 1",
    idea:"Philidor's Legacy — the most beautiful mate in chess. The king has been driven into the corner by knight checks; now the queen sacrifices herself on g8 to force the rook in front of its own king, and the knight smothers the king with its own pieces.",
    plans:"The classic finish: with the king boxed in by its own rook and pawns, sacrifice the queen on g8. The rook is forced to recapture, sealing the king's last escape, and the knight mates on f7 where the rook can't reach it.",
    line:["Qg8+","Rxg8","Nf7#"],
    notes:["The queen sacrifices herself right beside the king. The knight on h6 guards g8, so the king can't capture, and its own pawns on g7 and h7 block every escape.","Forced. The rook is the only piece that can take the queen — but now it sits on g8, sealing in its own king.","Smothered mate. The knight checks from f7 and the king is buried by its own pieces. The rook on g8 can't capture the knight, because g8 to f7 is a diagonal move and rooks only move in straight lines. That is the whole point of the combination."] },
  { name:"Back-Rank Mate", eco:"BR", side:"w", cat:"♚ Endgames & Theory",
    fen:"6k1/5ppp/8/8/8/8/8/R6K w - - 0 1",
    idea:"The most common mate in all of chess: a king trapped on his back rank by his own pawns, and a rook or queen swings to the edge for mate. Learn to spot it — and to avoid it by giving your king 'luft'.",
    plans:"When the enemy king is boxed in by its own pawns on the last rank, a rook or queen reaching that rank with no defenders in the way is instant mate.",
    line:["Ra8#"],
    notes:["The rook crashes to the back rank. The king is mated because its own f7-, g7- and h7-pawns block every escape. This is the back-rank mate — the reason careful players nudge a pawn to make 'luft' (a flight square) for their king."] },
  { name:"King & Pawn: the 6th Rank", eco:"K+P", side:"w", cat:"♚ Endgames & Theory",
    fen:"4k3/8/4K3/4P3/8/8/8/8 w - - 0 1",
    idea:"The most important pawn ending to know: with your king in front of the pawn on the 6th rank, you win no matter whose move it is. The king leads, the pawn follows.",
    plans:"Lead with the king, not the pawn. Get the king to the 6th rank ahead of the pawn (a 'key square'); then advance the pawn with the king shielding it, taking care not to stalemate.",
    line:["Kd6","Kd8","e6","Ke8","e7","Kf7","Kd7","Kf6","e8=Q"],
    notes:["The king leads the way, stepping in front of the pawn (key squares first, pawn later).","The black king tries to block.","Now the pawn advances, shielded by your king.","The king shuffles, but can't hold the pawn back.","One step from queening, and the black king must give way.","Forced aside.","The king escorts the pawn home, guarding the queening square.","Too late.","Promotion! The idea: king to the 6th rank first, then the pawn can't be stopped. (A rook's-pawn is the one exception — that only draws.)"] },
  { name:"Square of the Pawn", eco:"SQ", side:"w", cat:"♚ Endgames & Theory",
    fen:"8/8/8/P7/5k2/8/8/7K w - - 0 1",
    idea:"A geometry trick that saves you counting: to see whether a lone king can catch a passed pawn, picture the pawn's 'square'. If the king can't step into that square, the pawn queens.",
    plans:"Draw an imaginary square using the pawn's path to promotion as one side. If the enemy king is inside the square (or can step in on its move) it catches the pawn; if not, the pawn promotes untouched.",
    line:["a6","Ke5","a7","Kd6","a8=Q"],
    notes:["The pawn races. The black king on f4 is outside the pawn's square, so it can't catch up.","The king sprints after it…","…but with every step the pawn stays a tempo ahead.","Still chasing, still too far.","The pawn queens! The king was outside the square, so it never had a chance. Memorise the square — it saves calculating move by move."] },
  { name:"Rook & Knight Mate", eco:"R+N", side:"w", cat:"♚ Endgames & Theory",
    fen:"7k/8/6KN/8/8/8/8/7R w - - 0 1",
    idea:"A rook and knight combine for a neat forced mate in the corner — the knight takes away the escape squares while the rook delivers along the edge.",
    plans:"Use the knight (and your king) to remove the lone king's flight squares, then check with the rook along the back rank or the h-file for mate.",
    line:["Nf7+","Kg8","Rh8#"],
    notes:["The knight delivers a check from f7.","The only move: your king on g6 already guards g7 and h7.","Checkmate! The rook covers the 8th rank, the f7-knight guards h8 so the king can't capture the rook, and your king blankets the rest. A clean rook-and-knight finish."] },

  { name:"Lucena Position", eco:"R+P", side:"w", cat:"♚ Endgames & Theory",
    fen:"1K1k4/1P6/8/8/8/8/r7/4R3 w - - 0 1",
    idea:"The single most important winning position in rook endgames. Your king shelters in front of the pawn on the 7th rank; to promote you must 'build a bridge' with the rook to block the enemy's checks.",
    plans:"Drive the enemy king one file away, lift your rook to the 4th rank, then walk your king out toward the rook. When the checks run out, the rook interposes on the 4th rank — the 'bridge' — and the pawn queens.",
    line:["Rd1+","Ke7","Rd4","Ra1","Kc7","Rc1+","Kb6","Rb1+","Kc6","Rc1+","Kb5","Rb1+","Rb4"],
    notes:["First, shove the black king one file away from the pawn.","The king steps aside.","The key move: the rook lifts to the 4th rank, ready to become a 'bridge'.","Black waits, planning to check from the side again.","Now the king walks out from in front of the pawn.","The checks begin.","The king heads toward its own rook for shelter.","Still checking.","Zig-zagging out; the king can't stray far, as it guards the pawn.","Black keeps harassing.","Almost there.","The last check…","The bridge! The rook blocks the check, and Black can't stop b8=Q next move. This is the Lucena — the must-know rook-ending win."] },
  { name:"Philidor Position (the draw)", eco:"R=R+P", side:"w", cat:"♚ Endgames & Theory",
    fen:"8/7R/8/r7/2pk4/8/8/2K5 w - - 0 1",
    idea:"The most important DRAW in rook endgames. A rook down a pawn can still hold: keep your rook on the third rank to fence out the enemy king, then switch to checking from behind the moment the pawn advances.",
    plans:"While the enemy pawn has not yet reached the 3rd rank, keep your rook on that rank so the king can't advance. The instant the pawn steps onto the 3rd rank, swing the rook far back and check the king endlessly from behind.",
    line:["Rh3","Ra1+","Kc2","Ra2+","Kc1","c3","Rh8"],
    notes:["The third-rank defense: this fence stops the black king reaching the 3rd rank.","Black tries a side check.","Just step the king up, keeping it near the pawn's queening square.","Another check.","And back again; Black is making no progress.","The only try is to advance the pawn — but that is exactly what frees your rook.","Now switch plans: with the pawn on the 3rd rank, check from far behind. The checks never stop, so Black can't make progress — a draw. That's the Philidor."] },
  { name:"Anastasia's Mate", eco:"N+R#", side:"w", cat:"♚ Endgames & Theory",
    fen:"5rk1/5ppp/6N1/7Q/8/8/6K1/R7 w - - 0 1",
    idea:"A gorgeous forced mate using a knight and rook: the knight bottles up the king's escape squares, a queen sacrifice drags the king to the edge, and the rook delivers down the open file.",
    plans:"Plant the knight where it covers the king's escape squares, sacrifice the queen to force the king onto the open file, then mate with the rook along that file.",
    line:["Ne7+","Kh8","Qxh7+","Kxh7","Rh1#"],
    notes:["The knight checks and, crucially, covers g8 and g6 — the king's only escape squares.","Forced into the corner (f8 is blocked by the rook).","The queen sacrifices herself to drag the king out.","Forced to capture (g8 is covered by the knight).","Mate! The rook checks down the open h-file; the knight covers g6 and g8, so the king has nowhere to run. This is Anastasia's Mate."] },
  { name:"Boden's Mate", eco:"2B#", side:"w", cat:"♚ Endgames & Theory",
    fen:"2kr4/1p1n4/2p5/8/4QB2/8/8/5BK1 w - - 0 1",
    idea:"A dazzling two-bishop mating pattern against a queenside-castled king. A queen sacrifice rips open the long diagonal, and the two bishops criss-cross to deliver mate — the king smothered by his own pieces.",
    plans:"When the enemy king is castled queenside and boxed in by its own pieces, sacrifice to open a diagonal, then mate with two bishops cutting across each other.",
    line:["Qxc6+","bxc6","Ba6#"],
    notes:["The queen sacrifices herself to blast open the b7-square and the long diagonal.","Forced to recapture (every other square is covered).","Mate! The light bishop checks along a6–c8, the dark bishop covers b8 and c7, and the king's own rook and knight block the rest. The classic Boden's Mate, two bishops criss-crossing."] },
  { name:"Queen vs Pawn (on the 7th)", eco:"Q v P", side:"w", cat:"♚ Endgames & Theory",
    fen:"8/8/8/3K4/8/1k6/1p6/5Q2 w - - 0 1",
    idea:"Queen versus a pawn one step from promoting. The queen alone can't stop it — but by checking to force the enemy king IN FRONT of its own pawn, you steal a tempo each time to march your king up. (A rook-pawn or bishop-pawn can be a draw — see the note.)",
    plans:"Check to force the king onto the pawn's promotion square; that blocks the pawn for a move and gives you a free tempo to step your king closer. Repeat until your king arrives, then win the pawn or mate.",
    line:["Qc4+","Ka3","Qc2","Ka2","Kc4","Ka1","Qa4+","Kb1","Kc3","Kc1","Qc2#"],
    notes:["Check, nudging the king toward its own pawn.","The king is shoved back.","The queen sits in front of the pawn (covering b1), so it can't promote; the king must defend it.","Forced to guard the b2-pawn.","The whole point: while the queen freezes the pawn, your king sprints one square closer.","The king is driven in front of its own pawn (b1 is covered), blocking it again.","Another check to repeat the cycle.","Forced.","The king steps in again, now almost on top of the pawn.","Forced in front of the pawn one last time.","Checkmate! The cycle (check, freeze the pawn, walk the king up) beats a knight- or centre-pawn every time. Beware: with a rook-pawn (a/h) or bishop-pawn (c/f) the enemy king can dart into the corner for a stalemate trick, and it's only a draw if your king is far."] },
  { name:"Bishop & Knight Mate", eco:"B+N#", side:"w", cat:"♚ Endgames & Theory",
    fen:"7k/8/6K1/5N2/5B2/8/8/8 w - - 0 1",
    idea:"The hardest basic checkmate: king, bishop and knight versus a lone king. The catch — you can only mate in a corner the SAME colour as your bishop. Here the dark-squared bishop drives the king into the h8 (dark) corner.",
    plans:"Herd the king to a corner of your bishop's colour. The knight covers the squares the bishop can't, your king blankets the rest, and the bishop delivers. (Driving the king there uses the knight's looping 'W' path; this shows the finish.)",
    line:["Bh6","Kg8","Ne7+","Kh8","Bg7#"],
    notes:["A quiet but vital move: the bishop covers f8, removing an escape square before you check.","Forced. Your king on g6 already guards f7, g7 and h7, so the corner king has only g8.","Check! And because Bh6 covers f8, the king can't escape that way.","Forced back into the corner; every other square is covered.","Mate. The bishop checks along the long diagonal, the e7-knight guards g8, and your king covers h7. Mate is delivered in the corner matching the bishop — the whole point of this ending."] },
  { name:"Rook vs Pawn", eco:"R v P", side:"w", cat:"♚ Endgames & Theory",
    fen:"8/8/8/8/3K4/1k6/1p6/1R6 w - - 0 1",
    idea:"Rook versus a far-advanced passed pawn. The rook holds the pawn back (here from in front, covering b1) while your king hurries over to help capture it. Bring the king up and the rook mops up.",
    plans:"Use the rook to stop the pawn promoting (ideally from BEHIND it — 'rooks belong behind passed pawns'), then march your king in to win it. If your king is too far away, a rook-pawn on the 7th can slip away with a draw.",
    line:["Kd3","Kb4","Rxb2+"],
    notes:["The rook already covers b1, so the pawn is going nowhere; now the king marches up to help.","The black king can't both guard its pawn and stop yours, so it steps aside.","The rook scoops the pawn with check. It's now king-and-rook versus a lone king, an elementary win. The lesson: a rook beats a runaway pawn as long as your king can get close enough to help."] },

];

function findMoveBySAN(game,san){const want=cleanSAN(san);for(const mv of getLegal(game)){const nb=applyMove(game.board,mv);if(cleanSAN(toSAN(game,mv,nb))===want)return mv;}return null;}
// ── Play: adaptive strength + clock helpers ──
const ELO_MIN=400, ELO_MAX=2400;
// Map a target Elo to the built-in engine's search depth + blunder noise (centipawns).
function eloParams(elo){const d=elo<700?1:elo<1300?2:3;const r=Math.max(0,Math.round((1850-elo)*0.075));return{d,r};}
function fmtClock(ms){const s=Math.max(0,Math.ceil(ms/1000));const m=Math.floor(s/60);return m+':'+String(s%60).padStart(2,'0');}
const TIME_CONTROLS=[{label:'1 min',init:60,inc:0},{label:'2 min',init:120,inc:0},{label:'3 min',init:180,inc:0},{label:'5 min',init:300,inc:0},{label:'10 min',init:600,inc:0},{label:'1+1',init:60,inc:1},{label:'2+1',init:120,inc:1},{label:'3+1',init:180,inc:1}];
const CORR_CONTROLS=[{label:'1 day / move',days:1},{label:'3 days / move',days:3},{label:'7 days / move',days:7}];
function fmtLeft(ms){if(ms<=0)return 'time up';const m=Math.floor(ms/60000);const d=Math.floor(m/1440);const h=Math.floor((m%1440)/60);const mm=m%60;if(d>0)return d+'d '+h+'h';if(h>0)return h+'h '+mm+'m';return mm+'m';}
function clockFmt(ms){ms=Math.max(0,ms|0);const s=Math.ceil(ms/1000);const m=Math.floor(s/60);const ss=s%60;return m+':'+(ss<10?'0':'')+ss;}
function corrDeadline(g){if(!g||!g.tc||g.tc.kind!=='corr')return 0;return (g.moveAt||g.createdAt||Date.now())+g.tc.days*86400000;}
const CORRESPONDENCE=[{label:'1 day',days:1},{label:'3 day',days:3},{label:'5 day',days:5},{label:'30 day',days:30}];
function gameAfterLine(line){let g=initGame();for(const s of line){const mv=findMoveBySAN(g,s);if(!mv)break;g=makeMove(g,mv);}return g;}
// Position + last move after the first `ply` moves of a line (drives the auto-demo)
function demoState(line,ply,startFEN){let g=startFEN?fromFEN(startFEN):initGame(),last=null;for(let i=0;i<ply&&i<line.length;i++){const mv=findMoveBySAN(g,line[i]);if(!mv)break;last=mv;g=makeMove(g,mv);}return{game:g,last};}
// Batch 1 additions (2026-06-19): mainstream Sicilians, anti-Sicilians, Semi-Slav, KIA + 4 gambits. Lines engine-verified.
const MORE=[
  { name:"Najdorf Sicilian", eco:"B90", side:"b", cat:"Defenses to 1. e4",
    line:["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","a6"],
    idea:"The most famous Sicilian. 5…a6 is a flexible waiting move: it stops Nb5 and Bb5 and prepares …e5 or …e6 with queenside expansion by …b5. Razor-sharp and deeply analyzed.",
    notes:["White grabs the centre.","The Sicilian: fight for d4 without symmetry.","Develop and prepare d4.","Control e5 and open lines for the c8-bishop later.","Strike the centre open.","Black gets the half-open c-file in return.","Recapture; the knight sits proudly in the centre.","Develop and hit e4, forcing White to defend it.","Defend e4 and develop.","The Najdorf: stop Nb5 and Bb5, and prepare …e5 and …b5."],
    plans:"Fight for the centre with …e5 or …e6, expand on the queenside with …b5 and …Bb7, and develop quickly. White's main try is the English Attack (Be3, f3, Qd2, O-O-O, g4), so the game often becomes a race of opposite-side attacks." },
  { name:"Sicilian Dragon", eco:"B70", side:"b", cat:"Defenses to 1. e4",
    line:["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","g6"],
    idea:"Black fianchettoes the dark-squared bishop on g7, aiming it down the long diagonal at White's queenside. Both sides usually castle opposite and attack at full speed — one of the sharpest openings in chess.",
    notes:["Central pawn.","The Sicilian.","Develop, prepare d4.","Support e5, open the c8-bishop later.","Open the centre.","Half-open c-file.","Strong central knight.","Hit e4.","Defend e4.","The Dragon: fianchetto on g7 and rake the long diagonal."],
    plans:"…Bg7, …O-O, …Nc6, then …Rc8 and a queenside pawn storm down the half-open c-file. White's main try is the Yugoslav Attack (Be3, f3, Qd2, O-O-O, h4-h5) racing at Black's king." },
  { name:"Sveshnikov Sicilian", eco:"B33", side:"b", cat:"Defenses to 1. e4",
    line:["e4","c5","Nf3","Nc6","d4","cxd4","Nxd4","Nf6","Nc3","e5"],
    idea:"Black plays the bold …e5, kicking the d4-knight and accepting a backward d-pawn and a hole on d5 in exchange for active piece play and the bishop pair. Hugely popular at the top level.",
    notes:["Central pawn.","The Sicilian.","Develop, prepare d4.","Develop and pressure d4.","Open the centre.","Half-open c-file.","Central knight.","Hit e4.","Defend e4.","The Sveshnikov: kick the knight and seize space, accepting the d5 hole for active play."],
    plans:"After Ndb5 d6 and Bg5/Bxf6, Na3, Black gets …a6, …b5, …Bb7 and …f5, fighting for d5 and using the dark squares. Dynamic and concrete — Black plays for activity, not structure." },
  { name:"Accelerated Dragon", eco:"B34", side:"b", cat:"Defenses to 1. e4",
    line:["e4","c5","Nf3","Nc6","d4","cxd4","Nxd4","g6"],
    idea:"Black fianchettoes immediately with …g6, delaying …d6, so that …d5 can come in one move and the sharpest anti-Dragon lines are avoided. The price is allowing White's Maroczy Bind with c4.",
    notes:["Central pawn.","The Sicilian.","Develop.","Hit d4.","Open the centre.","Recapture coming.","Central knight.","The Accelerated Dragon: fianchetto at once, hoping for a quick …d5."],
    plans:"…Bg7, …Nf6, …O-O, and aim for the freeing …d5. Against the Maroczy Bind (c4), manoeuvre with …Nxd4, …Bd7-c6 and …a5 to pressure the bind. Solid and strategic." },
  { name:"Grand Prix Attack", eco:"B23", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","c5","Nc3","Nc6","f4","g6","Nf3","Bg7","Bc4","e6"],
    idea:"An aggressive anti-Sicilian: ignore the open Sicilian and play for a direct kingside attack with f4, Nf3 and Bc4 or Bb5. Easy to learn and dangerous at club level.",
    notes:["Central pawn.","The Sicilian.","The Grand Prix move order: develop and keep f4 ready.","Black develops.","The Grand Prix Attack: grab kingside space and aim for f5.","Black fianchettoes to blunt the attack.","Develop and support the f-pawn's advance.","The bishop eyes the long diagonal.","Point the bishop at f7 and e6.","Black blunts the bishop and prepares …Nge7."],
    plans:"Castle, play f4-f5 to pry open the kingside, and swing the queen and rook toward the black king with Qe1-h4 ideas. Black counters on the queenside, so meet …d5 and the …f5 break accurately." },
  { name:"Rossolimo Sicilian", eco:"B31", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","c5","Nf3","Nc6","Bb5","g6","Bxc6","dxc6","d3","Bg7"],
    idea:"Meet the Sicilian by trading on c6 with Bb5, sidestepping mountains of Najdorf and Dragon theory. After Bxc6 Black gets the bishop pair but doubled pawns and a slightly worse structure.",
    notes:["Central pawn.","The Sicilian.","Develop.","Develop.","The Rossolimo: pin the knight and avoid the open Sicilian.","Black prepares …Bg7.","Trade to give Black doubled c-pawns.","Recapture; Black gets the bishop pair but a worse structure.","Solid support of e4, opening the c1-bishop.","Black's bishop hits the long diagonal."],
    plans:"After Bxc6 dxc6, play d3, Nbd2, and aim for e5 and the e4-square; the doubled c-pawns are a long-term target. Keep a small, safe edge with simple development and a knight headed for c4 or e4." },
  { name:"Semi-Slav Defense", eco:"D45", side:"b", cat:"Defenses to 1. d4",
    line:["d4","d5","c4","c6","Nf3","Nf6","Nc3","e6","e3","Nbd7"],
    idea:"Black combines the Slav (…c6) and the Queen's Gambit Declined (…e6) into a rock-solid pawn triangle, keeping the option of grabbing the c4-pawn with …dxc4 and …b5 (the sharp Meran) or holding firm.",
    notes:["Central pawn.","Black stakes a central claim.","The Queen's Gambit: pressure d5.","The Slav move: support d5 without blocking the c8-bishop.","Develop, control e5.","Develop, guard d5.","Develop, add pressure to d5.","The Semi-Slav: rock-solid, but it shuts in the c8-bishop for now.","Open the f1-bishop, keep the centre solid.","Develop and prepare …dxc4 with …b5, or …e5."],
    plans:"Either …dxc4 and …b5 with …Bb7 and …c5 for queenside expansion, or a solid …Be7/…O-O setup. The light-squared bishop is the problem piece; freeing it with …b5-b4 or the …e5/…c5 breaks is Black's main job." },
  { name:"King's Indian Attack", eco:"A07", side:"w", cat:"Flank Openings",
    line:["Nf3","d5","g3","Nf6","Bg2","e6","O-O","Be7","d3","O-O"],
    idea:"A reusable system, not a forcing line: set up Nf3, g3, Bg2, O-O, d3, Nbd2 and then e4, playing the same plan against almost anything. Low theory, high understanding — a favourite of Fischer.",
    notes:["A flexible first move; the KIA can arise against many defences.","Black takes the centre.","Prepare the kingside fianchetto.","Natural development.","The bishop eyes the long diagonal and supports e4 later.","Black builds a solid centre.","King safety first.","Develop and prepare to castle.","The KIA spine: support a future e4.","Both sides are set; now White prepares e4 and a kingside plan."],
    plans:"Build the setup, play e4 to challenge the centre, then attack on the kingside with Re1, e5, Nf1-g3 (or h3) and a pawn storm. Meet Black's queenside space with patient piece play." },
  { name:"Benko Gambit", eco:"A57", side:"b", cat:"⚔️ Gambits — as Black",
    line:["d4","Nf6","c4","c5","d5","b5","cxb5","a6","bxa6","Bxa6"],
    idea:"Black sacrifices a wing pawn for long-term pressure: the half-open a- and b-files give the rooks and the a6-bishop lasting activity against White's queenside. One of the soundest gambits in chess.",
    notes:["Central pawn.","Develop, control e4.","Grab space.","Strike at d4 (a Benoni move order).","White grabs space and closes the centre.","The Benko Gambit: offer the b-pawn to open the queenside.","White accepts the pawn.","Chip at the b5-pawn to open the a- and b-files.","White grabs a second pawn but hands Black open lines.","The bishop rakes the a6-f1 diagonal; Black's pressure begins."],
    plans:"…Bxa6 (or …g6 and …Bg7), …d6, …Nbd7, …Ra7-b7 doubling on the b-file, and pressure on b2 and a2. The compensation is positional and durable — even an endgame a pawn down is often fine for Black." },
  { name:"Marshall Attack", eco:"C89", side:"b", cat:"⚔️ Gambits — as Black",
    line:["e4","e5","Nf3","Nc6","Bb5","a6","Ba4","Nf6","O-O","Be7","Re1","b5","Bb3","O-O","c3","d5"],
    idea:"Deep in the Ruy López, Black uncorks …d5, sacrificing the e5-pawn to blow open the centre and hurl pieces at White's king. One of the most respected and best-analyzed gambits at the highest level.",
    notes:["Central pawn.","The Open Game.","Hit e5.","Defend e5.","The Spanish bishop pins toward c6.","The Morphy move, question the bishop.","Keep the pin.","Develop and hit e4.","Castle; e4 is taboo for now.","Prepare to castle.","Defend e4 along the file.","Gain space and hit the bishop.","Retreat, eyeing f7.","King safety, setting the stage.","Prepare d4 and give the bishop a retreat.","The Marshall: sacrifice e5 to rip the centre open and attack."],
    plans:"After exd5 Nxd5 and …Nf6/…Bd6/…Qh4, throw the queen, rook (…Re6-h6 or g6) and bishops at the white king. The attack is often worth far more than the pawn; White must defend with great precision (g3, d4, Re1)." },
  { name:"Schliemann Gambit", eco:"C63", side:"b", cat:"⚔️ Gambits — as Black",
    line:["e4","e5","Nf3","Nc6","Bb5","f5","Nc3","fxe4","Nxe4","d5"],
    idea:"A sharp counter to the Ruy López: …f5 immediately, striking at the centre and grabbing the initiative. White must know the theory or risk being blown off the board; the practical chances are excellent.",
    notes:["Central pawn.","The Open Game.","Attack e5.","Defend e5.","The Ruy López pin.","The Schliemann: strike at e4 at once and seize the initiative.","The principled reply, developing and keeping e4 defended.","Open the f-file and grab the centre.","Recapture.","Hit the knight, gain the centre, and open lines for fast development."],
    plans:"After …fxe4 and …d5, Black gains the centre and open lines for quick development (…Bg4, …Qd7, …O-O-O). The game is concrete and tactical — play for activity and direct threats, not a slow build." },
  { name:"Göring Gambit", eco:"C44", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Nf3","Nc6","d4","exd4","c3","dxc3","Nxc3"],
    idea:"The Scotch's gambit cousin: sacrifice a pawn (or two) with c3 to rip the centre open and develop with tempo. After Nxc3 White has a big lead in development and open lines pointing at f7.",
    notes:["Central pawn.","The Open Game.","Hit e5.","Defend e5.","Strike the centre, the Scotch.","Black wins a pawn.","The Göring Gambit: offer a second pawn to blast the centre open.","Black takes the bait.","Recapture with a big lead in development and open lines at f7."],
    plans:"Quick development with Bc4, O-O, Qb3 and Rd1/Re1, aiming at f7 and the d-file. If Black clings to the extra pawn, the lead in development becomes a strong attack; Black does best to return material and develop." },
  { name:"Vienna Gambit", eco:"C29", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Nc3","Nf6","f4","d5","fxe5","Nxe4","Nf3"],
    idea:"The Vienna with a punch: after 2…Nf6 White plays 3.f4, offering a pawn to blast open the f-file and seize the centre. Black's best is 3…d5, and the game turns sharp at once.",
    notes:["Central pawn.","The Open Game.","The Vienna: develop and keep f4 in reserve.","Develop and eye e4.","The Vienna Gambit: offer a pawn to open the f-file and grab the centre.","The right reply: counter-strike in the centre rather than grab on f4.","Open the f-file and win the e5-pawn.","Black regains the pawn and centralizes.","Develop and prepare d3 to challenge the e4-knight."],
    plans:"After fxe5 Nxe4, develop fast with Nf3, d3 (kicking the e4-knight), Qe2 and Bc4 or O-O-O, using the half-open f-file against f7. Aim for d4 and a central, kingside initiative." },
  { name:"Falkbeer Counter-Gambit", eco:"C31", side:"b", cat:"⚔️ Gambits — as Black",
    line:["e4","e5","f4","d5","exd5","e4"],
    idea:"Instead of accepting the King's Gambit, Black counter-attacks with 2…d5 and 3…e4, giving a pawn to seize the centre and the initiative. A principled, aggressive answer to 2.f4.",
    notes:["Central pawn.","The Open Game.","The King's Gambit: offer the f-pawn for the centre.","The Falkbeer Counter-Gambit: hit the centre instead of taking on f4.","White grabs the pawn.","Clamp the centre: the advanced pawn cramps White and hands Black the initiative."],
    plans:"Keep the advanced e4-pawn as a thorn, develop actively with …Nf6, …Bc5 or …Bd6 and …O-O, and target White's loosened kingside. White must play d3 accurately to break the e4-pawn's grip." },
  { name:"Max Lange Attack", eco:"C55", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Nf3","Nc6","Bc4","Bc5","O-O","Nf6","d4","exd4","e5"],
    idea:"A violent open-game attack: White castles, plays d4 and e5, hurling the centre forward to expose Black's king. The lines are forcing and tactical, with sacrifices on f7 and e5 in the air.",
    notes:["Central pawn.","The Open Game.","Hit e5.","Defend e5.","The Italian bishop, eyeing f7.","The Giuoco Piano.","Castle and prepare d4.","Develop and hit e4.","The Max Lange: blow the centre open.","Black accepts.","Drive the f6-knight and lunge at the black king."],
    plans:"After …d5 (about forced), Bb5 or exf6 leads to sharp play with Re1, Bg5 and threats against the pinned f6-knight and the black king. Know the forcing lines — calculation, not manoeuvring, decides it." },
  { name:"Belgrade Gambit", eco:"C47", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Nf3","Nc6","Nc3","Nf6","d4","exd4","Nd5"],
    idea:"A surprise weapon out of the Four Knights: instead of recapturing on d4, White plays 5.Nd5, offering a pawn for a lead in development and tactical chances against e5 and f7.",
    notes:["Central pawn.","The Open Game.","Hit e5.","Defend e5.","The Four Knights.","Symmetrical development.","Strike the centre.","Black wins the pawn.","The Belgrade Gambit: ignore the d4-pawn and leap into the centre with threats."],
    plans:"After …Nxe4 or …Be7, play Bc4 or Bg5, Nxd4 and aim at f7 and the centre. The point is to catch an unprepared opponent in sharp lines; with accurate defence Black equalizes, but the practical value is high." },
  { name:"Urusov Gambit", eco:"C24", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Bc4","Nf6","d4","exd4","Nf3"],
    idea:"A sharp gambit from the Bishop's Opening: after 2…Nf6 White plays 3.d4, offering a pawn to open lines and develop with tempo toward f7. Dangerous and underestimated.",
    notes:["Central pawn.","The Open Game.","The Bishop's Opening: aim at f7 immediately.","Develop and hit e4.","The Urusov Gambit: offer a pawn to blow the centre open.","Black accepts.","Develop with tempo and prepare to round up d4 or play e5."],
    plans:"Regain or invest the pawn with Nf3, O-O, Nxd4 and e5, pointing the bishop and pieces at f7 and the king. If Black grabs greedily, the lead in development becomes a strong attack." },
  { name:"Staunton Gambit", eco:"A82", side:"w", cat:"⚔️ Gambits — as White",
    line:["d4","f5","e4","fxe4","Nc3","Nf6","Bg5"],
    idea:"An aggressive gambit against the Dutch: 2.e4 sacrifices a pawn to open the centre and develop quickly with Nc3 and Bg5, exploiting the slight weakening of Black's kingside by …f5.",
    notes:["Central pawn.","The Dutch Defense: grab kingside space and aim for an …e5 break.","The Staunton Gambit: offer a pawn to open the centre against the Dutch.","Black accepts.","Develop and attack the e4-pawn.","Defend e4 and develop.","Pin the knight; pressure on e4 and f6 builds."],
    plans:"Round up the e4-pawn with f3 and Nxe4, or play for piece pressure with Bxf6 and Qd2-h6 ideas against Black's loosened king. The …f5 move leaves light-square holes White aims to use." },
  { name:"Jerome Gambit", eco:"C50", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","Nf3","Nc6","Bc4","Bc5","Bxf7+","Kxf7","Nxe5+","Nxe5"],
    idea:"A famously unsound but wickedly tricky club gambit: White sacrifices two pieces with Bxf7+ and Nxe5+ to drag the black king out and hunt it. Objectively losing — but a great lesson in attack, defence, and what NOT to play seriously.",
    notes:["Central pawn.","The Open Game.","Hit e5.","Defend e5.","The Italian bishop, eyeing f7.","The Giuoco Piano.","The Jerome Gambit: sacrifice the bishop to expose the king.","The king must take.","A second sacrifice to keep the king running.","Black takes again, two pieces up; precise defence should win."],
    plans:"After the sacrifices, play Qh5+ and d4, trying to round up material and harass the exposed king. Black, if accurate (…g6, …Qe7, careful king moves), consolidates and wins — so the real lesson here is precise defence." },
  { name:"Old Indian Defense", eco:"A53", side:"b", cat:"Defenses to 1. d4",
    line:["d4","Nf6","c4","d6","Nc3","e5","Nf3","Nbd7"],
    idea:"The solid older cousin of the King's Indian: Black plays …d6 and …e5 without the …g6 fianchetto, building a compact, flexible centre. Less sharp than the King's Indian, but sound and easy to handle.",
    notes:["Central pawn.","Develop, control e4.","Grab space.","The Old Indian: prepare …e5 without committing to …g6.","Develop, support e4.","Strike at the centre.","Develop and pressure e5.","Support e5 and prepare …Be7 and …O-O."],
    plans:"…e5, …Be7, …O-O, then react in the centre: trade on d4 and use the e5-square, or hold the tension and manoeuvre with …Re8, …Bf8 and …g6 later. A patient, classical setup." },
  { name:"Chigorin Defense", eco:"D07", side:"b", cat:"Defenses to 1. d4",
    line:["d4","d5","c4","Nc6","Nc3","Nf6","Nf3","Bg4"],
    idea:"A provocative, piece-play answer to the Queen's Gambit: develop the knight to c6 and pin with …Bg4, fighting for the centre with pieces instead of the usual pawn chains. Unbalanced and fun.",
    notes:["Central pawn.","Black takes the centre.","The Queen's Gambit: pressure d5.","The Chigorin: develop a piece and eye d4, unconcerned about the c-pawn.","Develop, add pressure to d5.","Develop and guard d5.","Develop and defend d4.","Pin the knight; …Bxf3 and …e5 are coming."],
    plans:"…Bxf3 to damage White's structure, …e5 or …e6 with active piece play, and pressure on d4. Black accepts a slightly looser position for dynamic chances and the bishop-versus-knight imbalance." },
  { name:"Nimzowitsch Defense", eco:"B00", side:"b", cat:"Defenses to 1. e4",
    line:["e4","Nc6","d4","d5","e5","Bf5"],
    idea:"A hypermodern, offbeat defence: Black develops the knight to c6 on move one, inviting White to build a big centre that Black then undermines. Surprising and double-edged.",
    notes:["Central pawn.","The Nimzowitsch Defense: develop a piece, invite White to over-extend.","White grabs the big centre.","Strike back at once.","White clamps the centre.","Develop the bishop outside the pawn chain before …e6."],
    plans:"After e5, play …Bf5, …e6 and …Nge7 (or …f6), chipping at White's centre with …f6 and …Nb4 or …Qd7 ideas. A good surprise weapon that leaves book early." },
  { name:"Owen's Defense", eco:"B00", side:"b", cat:"Defenses to 1. e4",
    line:["e4","b6","d4","Bb7","Bd3","e6"],
    idea:"An offbeat hypermodern defence: Black fianchettoes the queen's bishop with …b6 and …Bb7, aiming at e4 and the long diagonal while letting White build a centre to be undermined later. A quiet surprise weapon.",
    notes:["Central pawn.","Owen's Defense: prepare to fianchetto on b7.","White takes the big centre.","The bishop rakes the long diagonal at e4 and g2.","Defend e4 and develop.","Open the f8-bishop and prepare …Nf6 and a central break."],
    plans:"…e6, …Nf6, …Be7 or …Bb4 and …d5 or …c5 to challenge the centre, with the b7-bishop pressuring e4 and g2. Solid but passive — time the central break well." },
  { name:"Richter-Veresov Attack", eco:"D01", side:"w", cat:"1. d4 — Queen's Pawn",
    line:["d4","Nf6","Nc3","d5","Bg5"],
    idea:"A London-style system with bite: White plays Nc3 and Bg5 early, pinning the f6-knight and preparing e4 or a quick attack. Low theory and aggressive — a Trompowsky cousin against …d5.",
    notes:["Central pawn.","Develop, control e4.","The Veresov: develop the knight and prepare Bg5 and e4.","Black takes the centre.","Pin the knight; Bxf6 and e4 ideas follow."],
    plans:"Bxf6 to damage the structure then e4, or hold the pin with f3 and Qd2 and aim for e4 and a kingside attack (O-O-O, h4). A simple, aggressive setup that ducks mainstream Queen's Gambit theory." },
  { name:"Berlin Defense", eco:"C65", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","e5","Nf3","Nc6","Bb5","Nf6","O-O","Nxe4","d4","Nd6","Bxc6"],
    idea:"Black answers the Ruy with 3…Nf6, the rock-solid Berlin. The famous Berlin Endgame arises after the trades and the queens come off — a drawish, technical battle that frustrated even Kasparov. You play White and learn to press the tiny edge.",
    notes:["Central pawn.","The Open Game.","Hit e5.","Defend e5.","The Ruy López.","The Berlin: develop and hit e4 at once.","Castle; e4 is given up for now.","Black grabs the pawn (the Berlin's point).","Strike the centre to regain the pawn.","The knight retreats and hits the b5-bishop.","Trade before recapturing on e5; the famous Berlin endgame looms."],
    plans:"After Bxc6 dxc6 and dxe5 Nf5, the queens come off and White has a kingside majority versus Black's bishop pair. Press slowly with Rd1, Nc3, h3 and king activity; the endgame is balanced but mainly Black can go wrong." },
  { name:"Open Ruy López", eco:"C80", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","e5","Nf3","Nc6","Bb5","a6","Ba4","Nf6","O-O","Nxe4","d4","b5","Bb3","d5"],
    idea:"Black grabs e4 with 5…Nxe4, opening the centre for piece play instead of the closed Ruy manoeuvring. White gets a strong centre and attacking chances; Black gets active pieces and the d5-strongpoint. Sharp and concrete.",
    notes:["Central pawn.","The Open Game.","Hit e5.","Defend e5.","The Ruy López pin.","The Morphy move.","Keep the pin.","Develop, hit e4.","Castle.","The Open Variation: grab the pawn and open the centre.","Strike the centre back.","Hit the bishop, gain space.","Retreat, eyeing f7 and d5.","Support the e4-knight and claim the centre."],
    plans:"After dxe5 Be6, play c3, Nbd2-b3 (or Re1) and pressure the e4/d5 knights. White aims at the centre and kingside; Black holds the strongpoints with …Bc5 or …Be7 and …O-O. Knowing the c3 and a4 breaks is key." },
  { name:"Exchange Ruy López", eco:"C68", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","e5","Nf3","Nc6","Bb5","a6","Bxc6","dxc6","O-O"],
    idea:"White trades on c6 at once, handing Black doubled pawns and the bishop pair but a clean structural plan. A Fischer favourite: simple, low-theory, and surprisingly venomous in the endgame.",
    notes:["Central pawn.","The Open Game.","Hit e5.","Defend e5.","The Ruy López pin.","Question the bishop.","The Exchange: double Black's pawns at once.","Recapture; the bishop pair but a damaged structure.","Castle and aim for a favourable endgame with the healthy majority."],
    plans:"After O-O and a later d4/dxe5, trade into an endgame where White's healthy kingside majority can make a passed pawn while Black's queenside majority is crippled by the doubled c-pawns. Trade pieces and head for that endgame." },
  { name:"Scheveningen Sicilian", eco:"B80", side:"b", cat:"Defenses to 1. e4",
    line:["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","e6"],
    idea:"Black builds the 'small centre' with …d6 and …e6, a flexible, resilient structure that is hard to crack. It blends easily with the Najdorf and gives Black a solid base for queenside counterplay.",
    notes:["Central pawn.","The Sicilian.","Develop.","Support e5, prepare the small centre.","Open the centre.","Half-open c-file.","Central knight.","Hit e4.","Defend e4.","The Scheveningen: the flexible small centre with …d6 and …e6."],
    plans:"…Be7, …O-O, …a6, …Qc7 and …b5 with …Bb7 for queenside play, plus the central …d5 or …e5 breaks when ready. Be ready for White's Keres Attack (g4) or English Attack kingside storm." },
  { name:"Taimanov Sicilian", eco:"B46", side:"b", cat:"Defenses to 1. e4",
    line:["e4","c5","Nf3","e6","d4","cxd4","Nxd4","Nc6"],
    idea:"A flexible, modern Sicilian: …e6 and …Nc6 keep the structure fluid and delay …d6. It dodges many sharp anti-Najdorf lines and can transpose to several systems depending on White's setup.",
    notes:["Central pawn.","The Sicilian.","Develop.","Flexible, supports …d5 later.","Open the centre.","Half-open c-file.","Central knight.","The Taimanov: develop and keep the structure flexible."],
    plans:"…Qc7, …a6, …Nf6 and …Bb4 or …Be7, with …b5 and …Bb7 for queenside play. Keep options open between …d6 (small centre) and …Bb4 pressure; piece activity and timing the …d5 break matter most." },
  { name:"Kan Sicilian", eco:"B42", side:"b", cat:"Defenses to 1. e4",
    line:["e4","c5","Nf3","e6","d4","cxd4","Nxd4","a6"],
    idea:"The Kan (Paulsen) is a flexible, low-maintenance Sicilian: …e6 and …a6 prepare …b5 and …Bb7 without committing the knights early. Easy to learn and hard to attack — a great practical system.",
    notes:["Central pawn.","The Sicilian.","Develop.","Flexible centre.","Open the centre.","Half-open c-file.","Central knight.","The Kan: prepare …b5 and …Bb7 with a flexible setup."],
    plans:"…b5, …Bb7, …Qc7, …Nf6 and …Be7 or …Bc5, with queenside expansion and the …d5 break in the centre. Keep a small, solid shell and counter on the light squares and the queenside." },
  { name:"Moscow Variation", eco:"B52", side:"w", cat:"1. e4 — King's Pawn",
    line:["e4","c5","Nf3","d6","Bb5+","Bd7","Bxd7+","Qxd7"],
    idea:"An anti-Sicilian like the Rossolimo, but versus …d6: White checks with Bb5+ and trades the light-squared bishop, steering for a calm, slightly favourable structure and avoiding heavy Najdorf and Dragon theory.",
    notes:["Central pawn.","The Sicilian.","Develop.","A Najdorf/Dragon move order.","The Moscow: check and offer to trade the light-squared bishops.","Block the check.","Trade off.","Recapture; White steers for a calm, slightly better structure."],
    plans:"After the bishop trade, play c4 (a Maroczy-style bind) or c3 and d4, with Nc3, O-O and pressure on d5 and the centre. Keep a small, safe edge; the absence of Black's light-squared bishop is a long-term plus." },
  { name:"Caro-Kann: Advance", eco:"B12", side:"b", cat:"Defenses to 1. e4",
    line:["e4","c6","d4","d5","e5","Bf5"],
    idea:"Against the Caro-Kann, White grabs space with 3.e5. Black's whole point is that the light-squared bishop gets OUT to f5 before …e6 locks it in — unlike the French. A solid, strategic battle over the centre.",
    notes:["Central pawn.","The Caro-Kann: prepare …d5 with a solid structure.","Build the big centre.","Strike at e4.","The Advance: grab space and lock the centre.","The key idea: develop the bishop OUT before …e6 shuts it in."],
    plans:"…e6, …Nd7, …Ne7 and …c5 to challenge the d4-e5 chain, with the f5-bishop safely developed. White expands with h4-h5 against the bishop; Black undermines the centre with …c5 and …f6." },
  { name:"Caro-Kann: Panov Attack", eco:"B13", side:"b", cat:"Defenses to 1. e4",
    line:["e4","c6","d4","d5","exd5","cxd5","c4"],
    idea:"White meets the Caro with an isolated-queen's-pawn structure: after exchanging on d5, 4.c4 challenges Black's centre and leads to lively piece play around the IQP. Black must handle the middlegame with care.",
    notes:["Central pawn.","The Caro-Kann.","Build the centre.","Strike at e4.","Open the position.","Recapture; a central pawn on d5.","The Panov: hit d5 and head for an isolated-pawn middlegame."],
    plans:"…Nf6, …Nc6, …e6 and …Be7 or …Bb4, blockading or pressuring the eventual isolated d-pawn. Trade pieces and target the IQP; White uses the open lines and active pieces the isolani provides." },
  { name:"French: Winawer", eco:"C15", side:"b", cat:"Defenses to 1. e4",
    line:["e4","e6","d4","d5","Nc3","Bb4"],
    idea:"The sharpest French: Black pins the c3-knight with …Bb4, pressuring e4 and forcing White to decide. After the usual e5 and …Bxc3, the game revolves around White's bishop pair and space versus Black's structure and counterplay.",
    notes:["Central pawn.","The French Defense: prepare …d5.","Build the centre.","Strike at e4.","Defend e4 and develop.","The Winawer: pin the knight and pile pressure on e4."],
    plans:"…Bxc3+, …c5, …Qc7 or …Ne7 and …f6, attacking the d4-e5 chain and the doubled c-pawns. White uses the bishop pair and Qg4 ideas; Black counters on the queenside and the dark squares. Double-edged and rich." },
  { name:"French: Advance", eco:"C02", side:"b", cat:"Defenses to 1. e4",
    line:["e4","e6","d4","d5","e5","c5"],
    idea:"White grabs space with 3.e5, locking the centre. Black immediately strikes the base of the pawn chain with …c5 — the classic French plan: undermine d4, then pile up on it. A clear strategic roadmap for both sides.",
    notes:["Central pawn.","The French Defense.","Build the centre.","Strike at e4.","The Advance: grab space and lock the centre.","Hit the base of the chain at once: the thematic French break."],
    plans:"…Nc6, …Qb6 and …Nge7-f5 (or …f6), hammering d4 and the e5-pawn. White defends the chain with c3, Nf3, Be2 and a kingside plan; Black trades on d4 and targets the weaknesses. The bad light-squared bishop is Black's main worry." },
  { name:"Ragozin Defense", eco:"D38", side:"b", cat:"Defenses to 1. d4",
    line:["d4","d5","c4","e6","Nf3","Nf6","Nc3","Bb4"],
    idea:"A flexible, active Queen's Gambit Declined: Black pins the c3-knight with …Bb4 (a Nimzo-Indian idea) while keeping …d5. It combines solid structure with piece activity and pressure on e4, and is fully sound at the top level.",
    notes:["Central pawn.","Black takes the centre.","The Queen's Gambit: pressure d5.","The Queen's Gambit Declined: solid support of d5.","Develop, control e5.","Develop, guard d5.","Develop, add pressure to d5 and e4.","The Ragozin: pin the knight and pressure e4, Nimzo-style."],
    plans:"…O-O, …dxc4 or …c5, and …Bxc3 at the right moment to damage White's structure or trade into comfort. Play for the …c5 and …e5 breaks and active pieces; the …Bb4 pin keeps White's centre honest." },
  { name:"Cambridge Springs", eco:"D52", side:"b", cat:"Defenses to 1. d4",
    line:["d4","d5","c4","e6","Nc3","Nf6","Bg5","Nbd7","Nf3","c6","e3","Qa5"],
    idea:"A classic counterattacking QGD: Black develops calmly, then springs …Qa5, pinning the c3-knight and pressuring both the g5-bishop and the c4-pawn. White must be careful, since several natural moves walk into tactics on c3 and g5.",
    notes:["Central pawn.","Black takes the centre.","The Queen's Gambit.","The QGD: solid support of d5.","Develop, pressure d5.","Develop, guard d5.","Pin the f6-knight.","Unpin support; prepare …c6 and …Qa5.","Develop.","Solidify d5 and open the queen's path to a5.","Open the f1-bishop.","The Cambridge Springs: pin Nc3 and hit c4 and g5 at once."],
    plans:"…Bb4 or …Ne4 to pile on the pinned knight and the g5-bishop, and …dxc4 at the right moment. Black plays for the double attack on c3 and g5; White usually plays Nd2 or cxd5 to defuse it." },
  { name:"Exchange QGD", eco:"D35", side:"w", cat:"1. d4 — Queen's Pawn",
    line:["d4","d5","c4","e6","cxd5","exd5","Nc3","Nf6","Bg5"],
    idea:"White releases the central tension early with cxd5, fixing a symmetrical structure and aiming for the classic minority attack: b4-b5 on the queenside to create a weakness in Black's pawns. A strategic, low-theory plan.",
    notes:["Central pawn.","Black takes the centre.","The Queen's Gambit.","The Queen's Gambit Declined.","The Exchange: fix a symmetrical structure.","Recapture; the classic Carlsbad structure.","Develop and eye the b5 break.","Develop.","Pin and prepare e3, Bd3 and the minority attack with b4-b5."],
    plans:"Develop Nc3, Bg5, e3, Bd3, O-O, then push b4-b5 to swap on c6 and leave Black a backward c-pawn or weak squares. The whole plan is the minority attack; piece play supports it." },
  { name:"Budapest Gambit", eco:"A52", side:"b", cat:"⚔️ Gambits — as Black",
    line:["d4","Nf6","c4","e5","dxe5","Ng4"],
    idea:"Black strikes with …e5 on move two, gambiting a pawn for fast, annoying piece play. After …Ng4 Black regains the pawn or gets active development, and White must avoid several known traps.",
    notes:["Central pawn.","Develop, control e4.","Grab space.","The Budapest Gambit: offer a pawn to open lines and develop fast.","White accepts.","Chase the e5-pawn and eye f2; active piece play begins."],
    plans:"…Nxe5 (or …Bc5 and …Nc6) with quick development, pressure on f2 and e3, and the bishop pair if White grabs space. Sound enough for a surprise weapon; play for activity and tactics around f2." },
  { name:"Blumenfeld Gambit", eco:"E10", side:"b", cat:"⚔️ Gambits — as Black",
    line:["d4","Nf6","c4","e6","Nf3","c5","d5","b5"],
    idea:"A Benoni-flavoured gambit: Black offers the b-pawn with …b5 to build a big pawn centre with …exd5 and …d5, gaining space and a strong central duo. If White grabs the pawn, Black gets a powerful centre in return.",
    notes:["Central pawn.","Develop.","Grab space.","Flexible, prepares …c5 and …d5.","Develop.","Strike at d4 (a Benoni move order).","White grabs space.","The Blumenfeld: gambit the b-pawn to build a big centre with …exd5 and …d5."],
    plans:"…exd5, …d5 and …Bd6 or …O-O with a broad centre and play down the half-open lines. Trade the wing pawn for central control and activity; White must challenge the centre quickly or be cramped." },
  { name:"Modern Benoni", eco:"A60", side:"b", cat:"Defenses to 1. d4",
    line:["d4","Nf6","c4","c5","d5","e6","Nc3","exd5","cxd5","d6"],
    idea:"A fighting Benoni: Black accepts a space disadvantage for the dynamic queenside pawn majority and the long diagonal for a fianchettoed bishop. Sharp and double-edged, beloved by Tal and Kasparov.",
    notes:["Central pawn.","Develop, control e4.","Grab space.","Strike at d4.","White grabs space.","Challenge the d5-pawn.","Develop.","Open the e-file and define the structure.","Recapture; the Benoni structure.","Support the queenside majority; …g6 and …Bg7 follow."],
    plans:"…g6, …Bg7, …O-O, …Re8 and the …b5 break, using the queenside majority and the g7-bishop. White plays e4, f4 and aims for e5 and a central or kingside attack. A winner-takes-all structure." },
  { name:"Czech Benoni", eco:"A56", side:"b", cat:"Defenses to 1. d4",
    line:["d4","Nf6","c4","c5","d5","e5"],
    idea:"A solid, closed Benoni: Black locks the centre with …e5, building a rock-solid but cramped position. With no immediate breaks, the game becomes a slow manoeuvring battle around the …f5 and …b5 breaks.",
    notes:["Central pawn.","Develop.","Grab space.","Strike at d4.","White grabs space.","The Czech Benoni: lock the centre for a solid, cramped manoeuvring game."],
    plans:"…d6, …Be7, …O-O, …Ne8-g7 and the …f5 break (or …a6 and …b5), patiently improving the pieces behind the closed centre. White expands on a wing; both sides manoeuvre for the right break. Patience is everything." },
  { name:"Bird's Opening", eco:"A02", side:"w", cat:"Flank Openings",
    line:["f4","d5","Nf3","Nf6","e3","g6"],
    idea:"A reversed Dutch: 1.f4 grabs kingside space and aims for a Stonewall or Leningrad setup with attacking ideas. Offbeat and low-theory, it takes Black out of book at once.",
    notes:["Bird's Opening: grab kingside space, a reversed Dutch.","Black takes the centre.","Develop and control e5.","Develop.","Open the f1-bishop, support the f4-pawn.","Black fianchettoes to contest the long diagonal."],
    plans:"Nf3, e3, Be2, O-O and d3 or b3, then a kingside build-up with Ne5 and Qe1-h4. The f4-pawn anchors a kingside attack; play for piece pressure and the e5-square. Mind the e1-h4 diagonal." },
  { name:"Nimzo-Larsen Attack", eco:"A01", side:"w", cat:"Flank Openings",
    line:["b3","e5","Bb2","Nc6","e3","Nf6"],
    idea:"Larsen's hypermodern system: 1.b3 fianchettoes the queen's bishop to b2, aiming straight down the long diagonal at e5 and the kingside. White invites Black to occupy the centre, then undermines it.",
    notes:["The Nimzo-Larsen: prepare to fianchetto the queen's bishop.","Black grabs the centre.","The bishop rakes the long diagonal at e5 and g7.","Defend e5 and develop.","Open the f1-bishop, keep the structure flexible.","Develop and guard e4."],
    plans:"Bb2, e3, Nf3 (or f4), Be2 or Bb5 and c4, pressuring e5 and the centre with pieces. Play flexibly, often delaying the d-pawn; the b2-bishop is the star. A great way to play your own game from move one." },
  { name:"Sokolsky Opening", eco:"A00", side:"w", cat:"Flank Openings",
    line:["b4","e5","Bb2","Bxb4","Bxe5","Nf6"],
    idea:"The Sokolsky (Polish, or Orangutan): 1.b4 grabs queenside space and prepares Bb2 on the long diagonal. If Black grabs the b4-pawn, Bxe5 hits back and regains material with active play. Quirky and venomous.",
    notes:["The Sokolsky: grab queenside space and prepare Bb2.","Black takes the centre.","The bishop eyes e5 and the long diagonal.","Black grabs the pawn.","Hit the e5-pawn, eyeing g7 and h8 to regain material.","Block the diagonal and develop; White has active play for the pawn."],
    plans:"After Bxe5, play Nf3, e3, c4 and a4, expanding on the queenside and using the b2-bishop's diagonal. Trade the wing pawn for central and queenside activity. A genuine surprise few opponents prepare for." },
  { name:"Grob's Attack", eco:"A00", side:"w", cat:"Flank Openings",
    line:["g4","d5","Bg2","Bxg4","c4"],
    idea:"The most notorious 'bad' opening: 1.g4 grabs space and fianchettoes to g2, hitting d5. Objectively dubious but full of traps. A fun lesson in coffeehouse chess and what NOT to play seriously.",
    notes:["Grob's Attack: grab kingside space (objectively dubious).","Black grabs the centre.","Fianchetto the bishop to hit d5.","Black grabs the loose g-pawn.","Strike at d5 and open lines for tricks; complications follow."],
    plans:"After …Bxg4 c4, pressure d5 and play for tactical chaos with Qb3 and Nc3. The point is surprise and complications; against accurate defence Black is just better, so the real lesson is punishing it as Black." },
  { name:"Muzio Gambit", eco:"C37", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","f4","exf4","Nf3","g5","Bc4","g4","O-O","gxf3"],
    idea:"One of the most romantic gambits ever played: deep in the King's Gambit, White CASTLES and lets Black grab the f3-knight, sacrificing a whole piece for a raging attack on f7. Unsound by modern standards, but a glorious attacking lesson.",
    notes:["Central pawn.","The Open Game.","The King's Gambit: offer the f-pawn for the centre.","Black accepts.","Stop …Qh4+ and develop.","Grab space and guard the f4-pawn.","Aim at f7.","Kick the f3-knight.","The Muzio: castle and sacrifice the knight for the attack.","Black grabs the piece; now White's attack on f7 begins."],
    plans:"After …gxf3 Qxf3, pile on f7 with Bxf7+ or Qxf7 ideas, e5, d4 and Bxf4, throwing everything at the black king. Often decisive in practice; the lesson is how a lead in development and open lines can outweigh a piece." },
  { name:"Kieseritzky Gambit", eco:"C39", side:"w", cat:"⚔️ Gambits — as White",
    line:["e4","e5","f4","exf4","Nf3","g5","h4","g4","Ne5"],
    idea:"The classical main line of the King's Gambit Accepted: White plays h4 to break up Black's kingside pawns, then jumps the knight to e5. Sharp and theoretical, with attacking chances against f7 and the loosened kingside.",
    notes:["Central pawn.","The Open Game.","The King's Gambit.","Black accepts.","Stop …Qh4+ and develop.","Guard the f4-pawn and grab space.","Strike at the g5-pawn to break up the kingside.","Push on and kick the knight.","The Kieseritzky: leap into e5, eyeing f7 and the centre."],
    plans:"Ne5, d4, Bxf4 (or Bc4) and Nc3, recovering the f4-pawn or building an attack on f7 and the open f-file. Play for piece activity and the initiative; Black must defend precisely to hold the extra pawn." },
  {name:"Three Knights Game",eco:"C46",side:"w",cat:"1. e4 — King's Pawn",
   line:["e4", "e5", "Nf3", "Nc6", "Nc3", "g6", "d4", "exd4", "Nxd4", "Bg7"],
   idea:"White brings out both knights before committing the bishop. If Black sidesteps the Four Knights with …g6, White seizes the centre with d4.",
   notes:["King's pawn forward.", "Black answers in the centre.", "Develop and pressure e5.", "Defend the e5-pawn.", "Develop the second knight, eyeing d5 and e4.", "Black fianchettos instead of …Nf6.", "Strike the centre while Black is uncastled.", "Black must capture.", "Recapture, centralising the knight.", "Complete the fianchetto and prepare to castle."],
   plans:"White enjoys a strong centre and easy development (Be2/Be3, O-O). Black castles, plays …Nf6 and …d6, and chips at d4 with …Nxd4 or a later …d5 break."},
  {name:"Hungarian Defense",eco:"C50",side:"b",cat:"Defenses to 1. e4",
   line:["e4", "e5", "Nf3", "Nc6", "Bc4", "Be7", "d4", "exd4", "Nxd4", "Nf6"],
   idea:"Black answers the Italian bishop with the modest …Be7, sidestepping the Evans Gambit and Fried Liver. Solid and safe, if a touch passive.",
   notes:["King's pawn forward.", "Black mirrors in the centre.", "Develop and pressure e5.", "Defend e5.", "The Italian bishop aims at f7.", "The quiet retreat, avoiding all the sharp Italian lines.", "White grabs the centre.", "Black captures.", "Recapture, centralising.", "Develop and hit e4, getting on with the game."],
   plans:"Black aims for a sturdy …d6, …O-O, …Re8 setup and looks to free the game with …d5 later. White has more space and tries to make the bishop pair and central majority count."},
  {name:"Sicilian: Classical",eco:"B56",side:"b",cat:"Defenses to 1. e4",
   line:["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "Nc6"],
   idea:"Black develops both knights naturally and stays flexible, keeping …e5, …g6 and …e6 setups all in reserve depending on what White chooses.",
   notes:["King's pawn forward.", "The Sicilian: fight for d4 asymmetrically.", "Develop and prepare d4.", "Support a future …e5 and free the c8-bishop.", "Open the centre.", "Black captures.", "Recapture, centralising.", "Develop and hit e4.", "Defend e4 and develop.", "Develop, eyeing d4 and e5."],
   plans:"Black chooses between the Richter-Rauzer (after Bg5), the Dragon (…g6) or a Scheveningen (…e6). The themes are queenside counterplay and the …e5 or …d5 freeing breaks. White castles long and attacks, or short and presses the centre."},
  {name:"Caro-Kann: Classical",eco:"B18",side:"b",cat:"Defenses to 1. e4",
   line:["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5", "Ng3", "Bg6"],
   idea:"The point of the Caro over the French: Black trades the centre pawn and develops the light bishop OUTSIDE the chain to f5 before playing …e6.",
   notes:["King's pawn forward.", "Prepare …d5 with a solid pawn behind it.", "Build the big centre.", "Challenge it at once.", "Recapture toward the centre.", "Trade off the cramping pawn.", "Recapture; the knight eyes the kingside.", "The good bishop comes out before …e6 locks it in.", "Harass the bishop.", "Retreat; the bishop is safe and active outside the chain."],
   plans:"Black follows with …e6, …Nd7, …Bd6 (or …Ngf6) and castles into a rock-solid structure. White has more space and a kingside pawn-storm option (h4-h5); Black relies on the sound structure and the well-placed pieces."},
  {name:"French: Rubinstein",eco:"C10",side:"b",cat:"Defenses to 1. e4",
   line:["e4", "e6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Nd7", "Nf3", "Ngf6"],
   idea:"Black gives up the centre to free the position and trade pieces, accepting a slightly passive but extremely solid structure with no bad bishop problem.",
   notes:["King's pawn forward.", "The French: prepare …d5.", "Build the centre.", "Challenge it.", "Defend e4 and develop.", "Trade the centre pawns to ease the cramp.", "Recapture.", "Prepare …Ngf6 without blocking the c-pawn.", "Develop and eye e5.", "Challenge the e4-knight and develop."],
   plans:"Black trades a pair of knights, plays …Be7, …O-O, …c5 and equalises by liquidating. White keeps a small space edge and tries to exploit the slightly freer development before Black untangles."},
  {name:"French: Exchange",eco:"C01",side:"b",cat:"Defenses to 1. e4",
   line:["e4", "e6", "d4", "d5", "exd5", "exd5", "Nf3", "Nf6", "Bd3", "Bd6"],
   idea:"White trades in the centre for a symmetrical, often drawish structure. Black simply mirrors and aims for easy development and active pieces.",
   notes:["King's pawn forward.", "The French.", "Build the centre.", "Challenge it.", "Trade the centre pawns.", "Recapture; the position is symmetrical.", "Develop toward the centre.", "Mirror the development.", "Place the bishop on its best diagonal.", "Mirror again; Black is comfortable."],
   plans:"Both sides develop, castle and contest the e-file. With symmetry, the half-point is near, but whoever plays more actively (bishop to g4/f5, rook to e1/e8, a timely …c5 or c4 break) keeps winning chances."},
  {name:"Scandinavian: Icelandic Gambit",eco:"B01",side:"b",cat:"⚔️ Gambits — as Black",
   line:["e4", "d5", "exd5", "Nf6", "c4", "e6", "dxe6", "Bxe6"],
   idea:"Black gambits a pawn for fast development and open lines: after …e6 and the trade, Black has both bishops aimed at White's position and a big lead in piece play.",
   notes:["King's pawn forward.", "Strike the centre immediately.", "White grabs the pawn.", "Develop and attack the d5-pawn instead of recapturing.", "Defend the extra pawn with the wedge.", "Undermine the wedge and open the e-file.", "White takes the pawn.", "Recapture with the bishop; Black is fully developed and a pawn down for strong activity."],
   plans:"Black throws pieces at White fast: …Bc5/…Bb4+, …O-O, …Nc6, and rooks to the open d- and e-files. White must return the pawn and finish developing without getting mated; if White consolidates, the extra pawn tells."},
  {name:"Scandinavian: Portuguese",eco:"B01",side:"b",cat:"⚔️ Gambits — as Black",
   line:["e4", "d5", "exd5", "Nf6", "d4", "Bg4"],
   idea:"Rather than regain the pawn at once, Black pins with …Bg4, developing fast and pressuring White's centre — a tricky modern gambit full of traps.",
   notes:["King's pawn forward.", "Strike the centre.", "White grabs the pawn.", "Develop and attack d5.", "Defend the pawn and build the centre.", "The Portuguese pin: develop with tempo and threaten …Qxd5 with pieces swarming."],
   plans:"Black follows with …Qxd5 (or …Bxf3 first), …Nc6 and quick castling, betting that the lead in development outweighs the pawn. White tries to untangle with Be2, f3 or Nf3 and hold the extra material."},
  {name:"Albin Counter-Gambit",eco:"D08",side:"b",cat:"⚔️ Gambits — as Black",
   line:["d4", "d5", "c4", "e5", "dxe5", "d4", "Nf3", "Nc6"],
   idea:"Against the Queen's Gambit, Black hits back with …e5. After dxe5 the advanced …d4 pawn cramps White and gives Black sharp, trap-laden play.",
   notes:["Queen's pawn forward.", "Black answers symmetrically.", "The Queen's Gambit: pressure d5.", "The Albin: counter-strike in the centre.", "White grabs the e-pawn.", "Push the pawn deep to cramp White.", "Develop and pressure the d4-pawn.", "Defend d4 and develop; watch for …Bb4+ and …d3 tricks."],
   plans:"Black plays …Bb4+, …Bg4 and …Qe7, hunting the e5-pawn and using the d4-wedge. A famous trap is …Bb4+ then …d3 against careless development. White returns the pawn for an edge if it untangles cleanly."},
  {name:"English: Symmetrical",eco:"A33",side:"w",cat:"Flank Openings",
   line:["c4", "c5", "Nf3", "Nf6", "Nc3", "Nc6", "d4", "cxd4", "Nxd4", "e6"],
   idea:"Both sides develop symmetrically until White opens with d4, steering into a flexible Maroczy-type middlegame where the extra tempo may eventually tell.",
   notes:["The English: flank control of d5.", "Black mirrors.", "Develop and prepare d4.", "Mirror the development.", "Develop the second knight.", "Mirror again.", "Open the centre.", "Black captures.", "Recapture, centralising.", "Prepare …d5 or …Bb4; the game leaves symmetry."],
   plans:"White angles for a small, durable edge: e3/Be2/O-O, pressure on the d-file, and the d5 or e4 break. Black equalises with …d5 or …Bb4 hitting c3. It often transposes to Sicilian-flavoured structures a tempo up."},
  {name:"English: Reversed Sicilian",eco:"A20",side:"w",cat:"Flank Openings",
   line:["c4", "e5", "Nc3", "Nf6", "Nf3", "Nc6", "g3", "d5", "cxd5", "Nxd5"],
   idea:"After 1.c4 e5 White is effectively playing a Sicilian a full tempo up. The plans mirror the Open Sicilian with the colours reversed.",
   notes:["The English.", "Black grabs the centre, a reversed Sicilian.", "Develop, eyeing d5.", "Develop and pressure e4 ideas.", "Develop and pressure e5.", "Defend e5.", "Fianchetto: the long diagonal hits d5 and b7.", "Black strikes back in the centre.", "Trade in the centre.", "Recapture, centralising; White presses with the extra tempo."],
   plans:"White fianchettos, castles and uses the extra tempo on a Sicilian structure: pressure d5/b7, expand with a3-b4 or play Nxd5. Black holds the centre and develops harmoniously to neutralise the tempo."},
  {name:"St. George Defense",eco:"B00",side:"b",cat:"Defenses to 1. e4",
   line:["e4", "a6", "d4", "b5", "Nf3", "Bb7", "Bd3", "e6"],
   idea:"An offbeat system: Black grabs queenside space with …a6 and …b5 and fianchettos to b7, aiming at e4. Unusual, but it has a real sting (Miles beat Karpov with it).",
   notes:["King's pawn forward.", "A quiet, provocative wait, preparing …b5.", "White takes the full centre.", "Gain queenside space and prepare the fianchetto.", "Develop and defend the centre.", "The fianchetto bishop eyes e4 along the long diagonal.", "Develop and protect e4.", "Prepare …c5 or …Nf6 and a flexible setup."],
   plans:"Black plays …c5, …Nf6, …Be7 and …d6/…d5, striking the centre once developed and using the b7-bishop's pressure. White builds a big centre and tries to prove it is overextension, not space."},
  {name:"Hippopotamus Defense",eco:"B00",side:"b",cat:"Defenses to 1. e4",
   line:["e4", "g6", "d4", "Bg7", "Nc3", "d6", "Be3", "a6", "Qd2", "b6"],
   idea:"Black builds a flexible double-fianchetto shell behind the third rank (…b6, …g6, …d6, …e6) and waits to counterpunch the moment White overextends.",
   notes:["King's pawn forward.", "Prepare the kingside fianchetto.", "White takes the centre.", "Develop the fianchetto bishop.", "Develop, eyeing d5 and e4.", "Keep the shell flexible and support …e5 later.", "Develop and eye the kingside.", "Prepare the second fianchetto with …b6.", "Connect and prepare to castle long or short.", "Complete the double fianchetto."],
   plans:"Black finishes with …Bb7, …Nd7, …Ne7 and castles, then breaks with …e5 or …c5 once White commits. White grabs space and must avoid lashing out; if Black is allowed to coil and strike, the counterattack is dangerous."},
  {name:"King's Gambit: Bishop's Gambit",eco:"C33",side:"w",cat:"⚔️ Gambits — as White",
   line:["e4", "e5", "f4", "exf4", "Bc4", "d5", "Bxd5", "Nf6", "Nc3", "Bb4"],
   idea:"White develops the bishop before the knight, daring …Qh4+. Against the freeing …d5, White grabs the pawn back and gets fast, attacking development for the gambit pawn.",
   notes:["King's pawn forward.", "Black mirrors.", "The King's Gambit: rip open the f-file.", "Black grabs the pawn.", "Develop the bishop first, hitting f7 and inviting …Qh4+.", "Black frees with the central break.", "Recapture; the bishop is active again.", "Develop and challenge the bishop.", "Develop and defend e4.", "Pin the knight and develop; the fight is sharp and roughly balanced."],
   plans:"White accepts a king on f1 if checked and plays for the open f-file, d4 and rapid development against f7. Black returns the f4-pawn at the right moment, castles and uses the better structure to blunt the attack."},
  {name:"King's Gambit: Cunningham",eco:"C35",side:"w",cat:"⚔️ Gambits — as White",
   line:["e4", "e5", "f4", "exf4", "Nf3", "Be7", "Bc4", "Bh4+", "g3", "fxg3", "O-O"],
   idea:"Black plays …Be7 to drop the bishop to h4 with check and stop White castling. White can ignore it: castle into the gambit and use the open f-file and lead in development.",
   notes:["King's pawn forward.", "Black mirrors.", "The King's Gambit.", "Black grabs the pawn.", "Develop and eye e5 and f7.", "The Cunningham: the bishop heads for h4.", "Aim the bishop at f7.", "Check, to stop White from castling.", "Block with the pawn.", "Black snaps it off and opens lines.", "Castle anyway: a pawn down for the open f-file, a development lead and pressure on f7."],
   plans:"White ignores the material, plays d4, Nc3 and doubles on the f-file against f7. Black must give the pawn back, finish developing and trade attackers to reach a safe, slightly better structure."},
  {name:"Two Knights Defense",eco:"C57",side:"b",cat:"Defenses to 1. e4",
   line:["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5", "exd5", "Na5"],
   idea:"Black meets the Italian bishop with the combative …Nf6, inviting the sharp Ng5. After …d5 …Na5 Black gives a pawn for a big lead in development and dangerous activity.",
   notes:["King's pawn forward.", "Black mirrors.", "Develop and pressure e5.", "Defend e5.", "The Italian bishop targets f7.", "Counterattack e4 and dare Ng5.", "The raid on f7, the critical test.", "Block and counter in the centre.", "White grabs the pawn.", "The Polerio: hit the bishop rather than fall for the Fried Liver, accepting a pawn deficit for the initiative."],
   plans:"Black plays …Nxc4 (or …h6), …Bc5/…Bd6 and quick castling, using the lead in development and open lines against White's loose pieces. White must give the extra pawn back and untangle to keep an edge."},
  {name:"Ruy Lopez: Closed",eco:"C84",side:"w",cat:"1. e4 — King's Pawn",
   line:["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7", "Re1", "b5"],
   idea:"The main-line Ruy Lopez: White pressures the e5/c6 complex and slowly builds with c3, d4 and a kingside regroup, the deepest strategic battleground in 1.e4 e5.",
   notes:["King's pawn forward.", "Black mirrors.", "Develop and pressure e5.", "Defend e5.", "The Spanish bishop pins toward c6 and e5.", "Question the bishop at once.", "Retreat, keeping the pin alive.", "Develop and hit e4.", "Castle and defend e4 by tactics on e5.", "Develop the bishop, ready to castle.", "Defend e4 and prepare d4.", "Gain space and shut the bishop's diagonal; the closed main lines begin."],
   plans:"White retreats Bb3, plays c3 and d4 and regroups with Nbd2-f1-g3 to attack the kingside. Black sets up …d6, …O-O, …Na5 or …Re8 and fights for …d5 or queenside space."},
  {name:"Arabian Mate",eco:"R+N#",side:"w",cat:"♚ Endgames & Theory",
   fen:"7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1",
   line:["Rh7#"],
   idea:"One of the oldest patterns known: a rook and knight team up to trap a king in the corner. The knight covers the escape square and shields the rook, which mates from right beside the king.",
   notes:["The rook swings to h7. The knight on f6 covers g8 and defends the rook, so the king cannot escape or capture: mate."],
   plans:"Keep the picture in mind: a knight a knight's-move from the cornered king (guarding the flight square and protecting), with the rook mating on the adjacent rank. It recurs constantly in rook-and-knight endings."},
  {name:"Epaulette Mate",eco:"Q#",side:"w",cat:"♚ Endgames & Theory",
   fen:"3rkr2/1Q6/3P4/8/8/8/8/6K1 w - - 0 1",
   line:["Qe7#"],
   idea:"This mate strikes when a king is boxed in by its own pieces on either side, like epaulettes on its shoulders. The queen mates from directly in front, defended so it cannot be taken.",
   notes:["The queen lands on e7, defended by the d6-pawn. The king's own rooks block d8 and f8, the queen covers d7 and f7, and the king cannot capture: mate."],
   plans:"Look for an enemy king flanked by its own rooks or pieces, then find a protected queen or rook to deliver mate on the square between them. It often appears when a king is herded onto a crowded back rank."},
  {name:"Dovetail Mate",eco:"Q#",side:"w",cat:"♚ Endgames & Theory",
   fen:"8/2p1p3/3k4/Q7/2P5/8/8/6K1 w - - 0 1",
   line:["Qd5#"],
   idea:"Also called Cozio's mate. The king is flanked by two of its own pieces on the squares diagonally behind it, and a protected queen mates from directly in front, leaving no escape.",
   notes:["The queen slides to d5, defended by the c4-pawn. The king's own pawns on c7 and e7 block the diagonal flights, the queen covers the rest, and it cannot capture: mate."],
   plans:"The signature is a king boxed by its own pawns or pieces on the two diagonal squares behind it, with the queen mating in front and defended. Spotting the blocked flight squares is the key."},
  {name:"Reading Chess Notation",eco:"",side:"w",cat:"♚ Endgames & Theory",
   line:["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O", "Nf6", "Ng5", "d5", "exd5", "Nxd5"],
   idea:"Algebraic notation is the standard way to write chess moves. A move names the piece by a capital letter (or nothing at all for a pawn) and then the square it moves to. A capture adds an x. A few more symbols finish the picture: + means check, # means checkmate, O-O is kingside castling and O-O-O is queenside, and a promoting pawn is written with its new piece, like e8=Q. When two identical pieces can reach the same square, add the file or rank they came from to tell them apart, like Nbd2.",
   notes:["Pawn moves are written as just the square the pawn lands on. There is no letter for a pawn.", "Black answers in the centre. Again, only the destination square is written.", "Pieces get a capital letter: N is the knight (K is the king, so the knight borrows N). This is knight to f3.", "Black's knight comes to c6, defending the e5-pawn.", "B is the bishop. Bishop to c4, aiming at the f7 square.", "Black's bishop mirrors on c5.", "Castling kingside is written O-O, two capital letter O's. The king and rook move together in one move.", "Black develops the second knight and eyes the e4-pawn.", "The knight jumps to g5, attacking f7.", "Black hits back in the centre with a pawn to d5.", "When a pawn captures, write its file, then x, then the square: the e-pawn takes on d5, so exd5.", "When a piece captures, put x after the letter: the knight takes the pawn on d5, so Nxd5."],
   plans:"Read every move as piece-then-square, with pawns as the exception (just the square). The best practice is to write down a few of your own games move by move. Once notation clicks, every chess book, puzzle, and online lesson opens up to you."},
  {name:"Petroff (Russian) Defense",eco:"C42",side:"b",cat:"Defenses to 1. e4",
   line:["e4", "e5", "Nf3", "Nf6", "Nxe5", "d6", "Nf3", "Nxe4", "d4", "d5", "Bd3", "Nc6"],
   idea:"The Petroff, or Russian Defense, meets 1.e4 e5 2.Nf3 with the symmetrical 2...Nf6, counterattacking instead of defending e5. It has a rock-solid, drawish reputation. One key point: Black must kick the knight with ...d6 before recapturing on e4, because 3...Nxe4 4.Qe2 wins material.",
   notes:["White opens with the king's pawn.", "Black answers symmetrically in the centre.", "White develops and attacks the e5-pawn.", "Instead of defending, Black counterattacks White's e4-pawn. This is the Petroff.", "White grabs the e5-pawn.", "Black kicks the knight before recapturing. Taking on e4 at once would walk into Qe2 winning material, so this comes first.", "The knight retreats to safety.", "Now Black safely recaptures on e4, restoring the material.", "White stakes out the centre and gains space.", "Black supports the e4-knight with a pawn.", "White develops the bishop, challenging the centralized knight.", "Black develops and pressures d4. The Petroff is a solid, symmetrical defense prized for its reliability."],
   plans:"Black aims for easy development and a sound structure (...Be7, ...O-O, ...Bf5 or ...Bg4), often steering toward symmetrical, balanced positions. White tries to use the small space edge from d4. If you want a defense that is hard to crack and light on memorization, the Petroff is ideal."},
  {name:"Closed Sicilian",eco:"B25",side:"w",cat:"1. e4 — King's Pawn",
   line:["e4", "c5", "Nc3", "Nc6", "g3", "g6", "Bg2", "Bg7", "d3", "d6", "f4", "e6"],
   idea:"The Closed Sicilian meets 1...c5 with 2.Nc3 and a kingside fianchetto (g3, Bg2), keeping the centre closed instead of entering the heavily analyzed Open Sicilian. White trades sharp theory for a clear plan: build up on the kingside and attack.",
   notes:["The king's pawn opening.", "Black plays the Sicilian, fighting for the centre asymmetrically.", "Rather than the open d4 lines, White keeps it closed and develops the knight. This is the Closed Sicilian.", "Black develops a knight to its natural square.", "White prepares a kingside fianchetto.", "Black mirrors the fianchetto plan.", "The bishop takes the long diagonal, eyeing the centre and queenside.", "Black's bishop does the same.", "A solid pawn supports e4 and frees the c1-bishop.", "Black builds a matching setup.", "White starts the thematic kingside expansion with f4, gaining space.", "Black strikes in the centre. The Closed Sicilian sidesteps Sicilian theory and aims for a slow kingside attack."],
   plans:"White's plan is easy to remember: f4, Nf3, O-O, then expand with f5, g4 and a kingside pawn storm. Black counters on the queenside with ...Rb8, ...b5 and ...b4. A great choice to avoid memorizing reams of Open Sicilian theory."},
  {name:"Ruy Lopez: Steinitz Defense",eco:"C62",side:"w",cat:"1. e4 — King's Pawn",
   line:["e4", "e5", "Nf3", "Nc6", "Bb5", "d6", "d4", "Bd7", "Nc3", "Nf6", "O-O", "Be7"],
   idea:"The Steinitz Defense to the Ruy Lopez plays 3...d6, a rock-solid way to bolster e5. Named for the first world champion, it is reliable but slightly passive, ceding White a small space advantage in return for a sturdy position.",
   notes:["The king's pawn opening.", "Black answers in the centre: the Open Game.", "White develops and attacks e5.", "Black defends e5.", "The Spanish bishop pressures the c6-knight, the Ruy Lopez.", "Black plays the solid Steinitz Defense, propping up e5 with the d-pawn.", "White hits the centre, the main challenge to the Steinitz.", "Black unpins by developing the bishop and defending c6.", "White brings the last minor piece toward the centre.", "Black develops the knight and eyes e4.", "White castles to safety.", "Black completes development and prepares to castle. The Steinitz is solid but a touch passive, giving White a small, lasting space edge."],
   plans:"Black keeps a compact structure (...Bd7, ...Nf6, ...Be7, ...O-O) and waits to free the position with ...exd4 or a later ...d5. White enjoys more space and easier development, building slow pressure on the e5- and d6-pawns."},
  {name:"Leningrad Dutch",eco:"A88",side:"b",cat:"Defenses to 1. d4",
   line:["d4", "f5", "g3", "Nf6", "Bg2", "g6", "Nf3", "Bg7", "O-O", "O-O", "c4", "d6"],
   idea:"The Leningrad Dutch pairs the Dutch ...f5 with a king's-fianchetto setup (...g6, ...Bg7). Black accepts a slightly loosened kingside for active piece play and a thematic ...e5 break, aiming for a double-edged fight rather than a quiet game.",
   notes:["White opens with the queen's pawn.", "Black answers with the Dutch, grabbing kingside space with the f-pawn.", "White fianchettoes, the standard antidote to the Dutch.", "Black develops the knight.", "The bishop takes the long diagonal.", "Black prepares a kingside fianchetto of his own, the Leningrad System.", "White develops the knight.", "Black's bishop reaches g7, raking the long diagonal toward White's centre.", "White castles.", "Black castles, reaching the classic Leningrad setup.", "White grabs central space with c4.", "Black supports a future ...e5 break. The Leningrad is the most aggressive Dutch, combining a fianchetto with the bite of ...f5."],
   plans:"Black castles, then strikes the centre with ...e5 (after ...Nc6 or ...Qe8 to prepare it), or expands on the kingside. White uses the extra central space and the long-diagonal bishop, often probing with d5 or play down the half-open c-file."}
];
const LIB=OPENINGS.concat(ENDGAMES).concat(MORE);
// ── Persistent progress: window.storage in Claude artifacts, localStorage on the web, else in-memory ──
const _PZMEM={};
const PZSTORE={
  async get(k){try{if(typeof window!=='undefined'&&window.storage){const r=await window.storage.get(k);return r?r.value:null;}}catch(e){}
    try{if(typeof localStorage!=='undefined')return localStorage.getItem(k);}catch(e){} return (k in _PZMEM)?_PZMEM[k]:null;},
  async set(k,v){try{if(typeof window!=='undefined'&&window.storage){await window.storage.set(k,v);return;}}catch(e){}
    try{if(typeof localStorage!=='undefined'){localStorage.setItem(k,v);return;}}catch(e){} _PZMEM[k]=v;}
};
const PZKEY='chesstrainer.progress.v1';
const PZUKEY='chesstrainer.unlock.v1';
const PZ_PIN='23123';   // ← unlock code: enter on the roadmap to open all tiers. Change to any code you like.
const pzSolvedInTier=(solved,t)=>PZ_TIERS[t].ids.reduce((n,id)=>n+(solved[id]?1:0),0);
// current rank = number of fully-completed tiers (0..8). Active/unlocked tier = min(rank, last).
function pzRank(solved){let r=0;for(let t=0;t<PZ_TIERS.length;t++){if(pzSolvedInTier(solved,t)>=PZ_TIERS[t].need)r=t+1;else break;}return r;}
// index (in PZ) of the next unsolved puzzle within tier t (falls back to tier start)
function pzNextInTier(solved,t){const tier=PZ_TIERS[t];for(let i=tier.start;i<tier.end;i++)if(!solved[PZ[i].id])return i;return tier.start;}
const pzTotalSolved=solved=>Object.keys(solved).length;
// ── Lichess puzzle loading (CORS is open, so a deployed static site can fetch directly) ──
function uciToMove(game,uci){const fc=FILES.indexOf(uci[0]),fr=8-(+uci[1]),tc=FILES.indexOf(uci[2]),tr=8-(+uci[3]),promo=uci[4];for(const m of getLegal(game)){if(m.fr===fr&&m.fc===fc&&m.tr===tr&&m.tc===tc){if(promo){if(m.promo&&m.promo.toLowerCase()===promo.toLowerCase())return m;}else if(!m.promo)return m;}}return null;}
function lichessReplay(pgn,ply){let g=initGame();const toks=String(pgn||'').trim().split(/\s+/).filter(t=>t&&!/^\d+\.+$/.test(t)&&!/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));for(let i=0;i<ply&&i<toks.length;i++){const mv=findMoveBySAN(g,toks[i]);if(!mv)return null;g=makeMove(g,mv);}return g;}
// position where solution[0] is legal (robust to Lichess initialPly off-by-one)
function _lichessSolvePos(pgn,initialPly,sol0){for(const p of [initialPly,initialPly+1,initialPly-1]){if(p<0)continue;const g=lichessReplay(pgn,p);if(g&&uciToMove(g,sol0))return g;}return null;}
function _walkUci(g0,uci,start){let g=g0;const sol=[],reply=[];for(let i=start;i<uci.length;i++){const mv=uciToMove(g,uci[i]);if(!mv)return null;const san=toSAN(g,mv,applyMove(g.board,mv));g=makeMove(g,mv);if((i-start)%2===0)sol.push(san);else reply.push(san);}return {sol,reply};}
const _lvlR=r=>!r?'Medium':r<1000?'Easy':r<1500?'Medium':r<1900?'Hard':'Expert';
const _themeLabel=th=>{const m={mateIn1:'Mate in 1',mateIn2:'Mate in 2',mateIn3:'Mate in 3',mateIn4:'Mate in 4',mate:'Checkmate',fork:'Fork',pin:'Pin',skewer:'Skewer',hangingPiece:'Hanging piece',discoveredAttack:'Discovered attack',doubleCheck:'Double check',sacrifice:'Sacrifice',deflection:'Deflection',backRankMate:'Back-rank mate',smotheredMate:'Smothered mate',promotion:'Promotion',endgame:'Endgame',advantage:'Win material',crushing:'Crushing attack'};if(!th||!th.length)return 'Tactic';for(const k of ['mateIn1','mateIn2','mateIn3','mateIn4','smotheredMate','backRankMate','fork','pin','skewer','discoveredAttack','doubleCheck','sacrifice','deflection','hangingPiece','promotion','crushing','advantage','endgame'])if(th.includes(k))return m[k];return m[th[0]]||'Tactic';};
function _lichessObj(g0,uci,start,rating,themes,id){const w=_walkUci(g0,uci,start);if(!w||!w.sol.length)return null;const side=g0.turn==='w'?'White':'Black';const th=Array.isArray(themes)?themes:String(themes||'').split(/\s+/).filter(Boolean);const mate=/mate/i.test(th.join(' '));return {pos:g0,id:'lichess:'+(id||Math.random().toString(36).slice(2,9)),sol:w.sol,reply:w.reply,rating:rating||null,side:g0.turn,ext:true,url:id?('https://lichess.org/training/'+id):null,goal:side+' to move — '+(mate?'force checkmate':'win the position'),motif:_themeLabel(th),level:_lvlR(rating),hint:mate?'Look for the forcing checks that trap the king.':'Find the strongest forcing line — checks, captures and threats.',explain:'Solved!'+(rating?(' (Lichess rating '+rating+'.)'):'')};}
function lichessFromApi(json){try{const pz=json.puzzle,gm=json.game;if(!pz||!gm||!pz.solution)return null;const g0=_lichessSolvePos(gm.pgn,pz.initialPly|0,pz.solution[0]);if(!g0)return null;return _lichessObj(g0,pz.solution,0,pz.rating,pz.themes,pz.id);}catch(e){return null;}}
function lichessFromPack(row){try{if(!row)return null;if(row.pgn&&row.solution)return lichessFromApi({game:{pgn:row.pgn},puzzle:row});let g=fromFEN(row.fen||row.f);const uci=String(row.moves||row.m||'').trim().split(/\s+/);if(uci.length<2)return null;const setup=uciToMove(g,uci[0]);if(!setup)return null;g=makeMove(g,setup);return _lichessObj(g,uci,1,row.rating||row.r,row.themes||row.th,row.id||row.i);}catch(e){return null;}}
// Square name ("e4") → [row,col] in internal (white-at-bottom) coords
function sq2rc(sq){const c=FILES.indexOf(sq[0]);const r=8-parseInt(sq[1],10);return[r,c];}
// One arrow (line + filled head) between two square centres, in board pixels
function arrowEls(x1,y1,x2,y2,color,SQ,key){
  const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,px=-uy,py=ux;
  const sx=x1+ux*SQ*0.30,sy=y1+uy*SQ*0.30;            // start just outside the source square
  const tipx=x2-ux*SQ*0.10,tipy=y2-uy*SQ*0.10;        // tip near the target centre
  const headL=SQ*0.34,headW=SQ*0.30,bx=tipx-ux*headL,by=tipy-uy*headL,w=SQ*0.14;
  return(<g key={key}>
    <line x1={sx} y1={sy} x2={bx} y2={by} stroke={color} strokeWidth={w} strokeLinecap="round" opacity="0.88"/>
    <polygon points={`${tipx},${tipy} ${bx+px*headW/2},${by+py*headW/2} ${bx-px*headW/2},${by-py*headW/2}`} fill={color} opacity="0.88"/>
  </g>);
}
function _Arrows({arrows,SQ,flip,boardPx}){
  if(!arrows||!arrows.length)return null;
  return(<svg width={boardPx} height={boardPx} style={{position:'absolute',top:0,left:0,pointerEvents:'none',zIndex:4}}>
    {arrows.map((a,i)=>{const[fr,fc]=a.from,[tr,tc]=a.to;const Rf=flip?7-fr:fr,Cf=flip?7-fc:fc,Rt=flip?7-tr:tr,Ct=flip?7-tc:tc;return arrowEls((Cf+0.5)*SQ,(Rf+0.5)*SQ,(Ct+0.5)*SQ,(Rt+0.5)*SQ,a.color||'var(--ac)',SQ,i);})}
  </svg>);
}
// Match a drop/click square to a legal target — castling also triggers when
// the king is dropped on its own rook (the standard app gesture).
function matchTarget(tgts,r,c){
  let m=tgts.find(t=>t.tr===r&&t.tc===c);
  if(m)return m;
  for(const t of tgts){if(t.castle){const rookCol=t.castle==='K'?7:0;if(t.tr===r&&c===rookCol)return t;}}
  return null;
}

const THEMES=[
  { name:"Forest",   light:"#eeeed2", dark:"#769656", bg:"#1a1a2e", glow:"rgba(120,160,80,.13)", accent:"#9ab860", accent2:"#aad07a", rgb:"154,184,96", group:"classic" },
  { name:"Walnut",   light:"#e8cfa0", dark:"#9c6b3f", bg:"#20170f", glow:"rgba(180,130,70,.13)", accent:"#c89a5a", accent2:"#e6b87a", rgb:"200,154,90", group:"classic" },
  { name:"Ocean",    light:"#dbe7f0", dark:"#587fa0", bg:"#0e1626", glow:"rgba(90,150,210,.15)", accent:"#5b9bd5", accent2:"#8fc4ec", rgb:"91,155,213", group:"playful" },
  { name:"Dusk",     light:"#e8dcef", dark:"#896fa0", bg:"#181027", glow:"rgba(150,110,195,.16)", accent:"#a47fc8", accent2:"#c8a9e4", rgb:"164,127,200", group:"playful" },
  { name:"Coral",    light:"#f2ddd3", dark:"#c17a69", bg:"#241614", glow:"rgba(205,120,100,.14)", accent:"#dd8a68", accent2:"#f2ab88", rgb:"221,138,104", group:"playful" },
  { name:"Graphite", light:"#dadade", dark:"#6d6d75", bg:"#151517", glow:"rgba(175,175,185,.10)", accent:"#a6acba", accent2:"#cdd2dc", rgb:"166,172,186", group:"classic" },
  { name:"Slate",    light:"#dde3ea", dark:"#5d6f80", bg:"#121821", glow:"rgba(120,140,165,.12)", accent:"#7e94a8", accent2:"#a7bccf", rgb:"126,148,168", group:"classic" },
  { name:"Stone Keep", light:"#d2ccc0", dark:"#736a5d", bg:"#1a1714", glow:"rgba(150,140,120,.12)", accent:"#a99a82", accent2:"#cdbfa3", rgb:"169,154,130", group:"medieval" },
  { name:"Parchment", light:"#e9dcbf", dark:"#9c7a49", bg:"#201913", glow:"rgba(180,140,80,.13)", accent:"#c69a4f", accent2:"#e6c178", rgb:"198,154,79", group:"medieval" },
  { name:"Dragonstone", light:"#cfc8c2", dark:"#4c4742", bg:"#13100e", glow:"rgba(200,90,60,.13)", accent:"#d2603a", accent2:"#f0885c", rgb:"210,96,58", group:"medieval" },
  { name:"Royal",    light:"#ebe3cf", dark:"#6f5391", bg:"#170f28", glow:"rgba(150,110,190,.15)", accent:"#c6a24c", accent2:"#e7c869", rgb:"198,162,76", group:"medieval" },
  { name:"Candy",    light:"#ffe3ef", dark:"#e8729f", bg:"#291526", glow:"rgba(255,120,170,.14)", accent:"#ff7fb0", accent2:"#ffaecb", rgb:"255,127,176", group:"playful" },
];
// Paste your Stripe Payment Link (or Checkout URL) here to make the Upgrade plan buttons open real checkout.
// Until then they show a "coming soon" note. NOTE: granting Pro after payment needs the backend webhook (see backlog).
const STRIPE_LINK="";
// Stripe TEST/sandbox price IDs for "Chess Trainer Pro". Checkout runs through the
// firestore-stripe-payments extension via CTCloud.proCheckout (see host index.html).
const STRIPE_PRICE_MONTHLY="price_1Tfk6UHP2QrcLuy1Y3H5livy";  // $0.99 / month (TEST)
const STRIPE_PRICE_YEARLY ="price_1Tfk6UHP2QrcLuy1AnEX49pe";  // $9.99 / year  (TEST)
// SKINS: a "skin" is a full visual identity (palette + background texture + heading font + tile look + icons),
// not just board colours. pal = index into THEMES (board + accent colours).
const SKINS=[
  { key:'playful', name:'Playful', blurb:'Bright, rounded and friendly', pal:2, pro:true,
    font:"'Baloo 2','Segoe UI',sans-serif", tex:'',
    icons:{learn:'🔭',puzzle:'🧩',analyze:'🔍',play:'♟️'} },
  { key:'classic', name:'Classic', blurb:'Clean tournament green', pal:0, bgc:'#14161b',
    font:"'Playfair Display',serif",
    tex:'radial-gradient(circle at 50% 0%, rgba(200,154,90,.07), transparent 55%), radial-gradient(circle at 50% 120%, rgba(0,0,0,0), rgba(0,0,0,.22))',
    tints:{learn:['#5f8a9c','#3f6675'],puzzle:['#bf9a57','#8f6d33'],analyze:['#7f9a6a','#566f45'],play:['#5a9a63','#3c7a45']},
    icons:{learn:'📖',puzzle:'🧩',analyze:'📈',play:'👑'} },
  { key:'medieval', name:'Medieval', blurb:'Aged stone, parchment & gold', pal:8, pro:true,
    font:"'Cinzel',serif",
    pcf:'drop-shadow(0 2px 2px rgba(0,0,0,.45))',
    tex:'radial-gradient(circle at 20% 18%, rgba(150,120,80,.11), transparent 42%), radial-gradient(circle at 82% 74%, rgba(110,80,50,.13), transparent 46%), linear-gradient(160deg, rgba(60,45,28,.18), rgba(12,8,5,.32))',
    trim:'rgba(201,162,76,.6)',
    tints:{learn:['#3c5a82','#26405e'],puzzle:['#caa24c','#937129'],analyze:['#6f4a86','#462c58'],play:['#a8423a','#742824']},
    icons:{learn:'📜',puzzle:'🗝️',analyze:'🛡️',play:'⚔️'} },
];
const CLASSIC_IDX=Math.max(0,SKINS.findIndex(s=>s.key==='classic'));
const LIGHT_SQ=THEMES[0].light, DARK_SQ=THEMES[0].dark;
const HL_SEL='rgba(255,255,0,.5)', HL_LAST='rgba(255,255,0,.35)', HL_CHK='rgba(220,50,47,.7)', HL_PRE='rgba(255,112,82,.55)';
const HL_HINT='rgba(255,200,30,.75)', HL_BEST='rgba(110,214,110,.5)';
const DOT_L='rgba(0,0,0,.18)', DOT_D='rgba(0,0,0,.22)', CAP_C='rgba(0,0,0,.18)';
const UNI={w:{k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'},b:{k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}};

function _Piece({t,color,sz,ghost,useFallback,onFail}){
  const style={width:sz,height:sz,display:'block',opacity:ghost?0.3:1,pointerEvents:'none',flexShrink:0};
  if(useFallback)return(<div style={{...style,display:'flex',alignItems:'center',justifyContent:'center',fontSize:sz*0.72,lineHeight:1,color:color==='w'?'#fff':'#1a1a1a',textShadow:color==='w'?'0 0 2px #000,1px 1px 0 #444,-1px -1px 0 #444':'0 0 2px rgba(255,255,255,.6)'}}>{UNI[color][t]}</div>);
  return <img src={PIECE_IMG[color+t]} width={sz} height={sz} style={{...style,filter:color==='b'?'var(--pcfilter) drop-shadow(0 0 1px rgba(255,255,255,.55)) drop-shadow(0 0 1.5px rgba(255,255,255,.28))':'var(--pcfilter)'}} onError={onFail} draggable={false} alt=""/>;
}
function Tab({label,active,onClick}){
  return <button onClick={onClick} style={{flex:1,padding:'8px 4px',border:'none',cursor:'pointer',background:active?'var(--ac)':'transparent',color:active?'#fff':'rgba(255,255,255,.55)',fontSize:'clamp(11px,2.5vw,13px)',fontWeight:active?700:500,borderRadius:6,transition:'all .15s',letterSpacing:.3,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>{label}</button>;
}
function EvalGraph({analysis,plies,ply,onJump,width,height}){
  const H=height||72,n=analysis.length;if(!n)return null;
  const pad=4;
  const pt=(i)=>{const e=Math.max(-6,Math.min(6,analysis[i].evalAfter));const x=(i/(n-1||1))*width;const y=H/2-(e/6)*(H/2-pad);return[x,y];};
  const pts=analysis.map((_,i)=>pt(i));
  const line=pts.map((p,i)=>`${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area=`M0,${H/2} `+pts.map(p=>`L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')+` L${width},${H/2} Z`;
  const cur=ply>0?Math.min(ply-1,n-1):0;
  const cx=(cur/(n-1||1))*width;
  return(
    <svg width={width} height={H} style={{display:'block',cursor:'pointer',borderRadius:6}}
      onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const f=(e.clientX-r.left)/r.width;onJump(Math.round(f*(n-1))+1);}}>
      <rect x="0" y="0" width={width} height={H/2} fill="rgba(255,255,255,.06)"/>
      <rect x="0" y={H/2} width={width} height={H/2} fill="rgba(0,0,0,.30)"/>
      <line x1="0" y1={H/2} x2={width} y2={H/2} stroke="rgba(255,255,255,.25)" strokeWidth="1" strokeDasharray="4 3"/>
      <path d={area} fill="rgba(var(--acr),.20)"/>
      <path d={line} fill="none" stroke="var(--ac)" strokeWidth="2"/>
      {analysis.map((a,i)=>{const L=a.cls&&a.cls.label;const m=L==='Brilliant'?['#22d3ee',4]:L==='Great'?['#7bd3c0',3.4]:L==='Blunder'?['#ec5c4e',4]:L==='Miss'?['#f08a5d',3.6]:L==='Mistake'?['#f0a24e',3.4]:L==='Inaccuracy'?['#f0cf5e',2.6]:null;if(!m)return null;const p=pt(i);return(<circle key={'m'+i} cx={p[0]} cy={p[1]} r={m[1]} fill={m[0]} stroke="rgba(0,0,0,.5)" strokeWidth="1" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();onJump(i+1);}}/>);})}
      {ply>0&&<line x1={cx} y1="0" x2={cx} y2={H} stroke="#ffd84d" strokeWidth="1.5"/>}
      {ply>0&&<circle cx={cx} cy={pt(cur)[1]} r="4.5" fill="#ffd84d" stroke="rgba(0,0,0,.5)" strokeWidth="1"/>}
    </svg>
  );
}
// Premium 3D ivory/gold pawn used in the wordmarks. idp makes the gradient ids unique per instance.
// Unified line-icon set (monochrome, inherits the accent colour) so icons match every skin instead of clashing as full-colour emoji.
function _AppIcon({name,size=24,color='currentColor',sw=2,style}){
  const P={
    learn:<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
    puzzle:<path d="M9 3a2 2 0 0 1 4 0c0 .6-.2 1-.5 1.4H15a1 1 0 0 1 1 1v2.1c.4-.3.8-.5 1.4-.5a2 2 0 0 1 0 4c-.6 0-1-.2-1.4-.5V17a1 1 0 0 1-1 1h-2.6c.3-.4.5-.8.5-1.4a2 2 0 0 0-4 0c0 .6.2 1 .5 1.4H6a1 1 0 0 1-1-1v-2.6c-.4.3-.8.5-1.4.5a2 2 0 0 1 0-4c.6 0 1 .2 1.4.5V5.4A1 1 0 0 1 6 4.4h2.5C8.2 4 8 3.6 8 3"/>,
    analyze:<><circle cx="10.5" cy="10.5" r="6.5"/><line x1="20" y1="20" x2="15.5" y2="15.5"/></>,
    play:<><circle cx="12" cy="6.5" r="2.6"/><path d="M9.4 9.4C9.4 12 9 13.6 8 15h8c-1-1.4-1.4-3-1.4-5.6"/><path d="M6.8 15h10.4l1.4 4H5.4z"/></>,
    computer:<><rect x="2.5" y="3.5" width="19" height="13" rx="2"/><line x1="8" y1="20.5" x2="16" y2="20.5"/><line x1="12" y1="16.5" x2="12" y2="20.5"/></>,
    human:<><path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19"/><circle cx="10" cy="7.5" r="3.5"/><path d="M19.5 19v-1.5a3.5 3.5 0 0 0-2.6-3.4"/><path d="M15 4.1a3.5 3.5 0 0 1 0 6.8"/></>,
    online:<><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a14 14 0 0 1 3.6 9 14 14 0 0 1-3.6 9 14 14 0 0 1-3.6-9A14 14 0 0 1 12 3z"/></>,
  };
  return(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{P[name]||null}</svg>);
}
function _Coach({size=46,accent='var(--ac)',style='comb'}){
  const hair=style==='side'?(<path d="M16 25 C15 12 24 8 33 8 C43 8 49 12 48 26 C46 19 41 17 36 17 C38 14 34.5 13 32.5 14.5 C30 12.5 26 13 25 16.5 C22 16 18 19 16 25 Z" fill="#6b4a30"/>)
   :style==='recede'?(<path d="M18 25 C18 13 24 10 32 10 C40 10 46 13 46 25 C45 20 40 18.5 36 18.5 C36 15 33 14 32 15 C31 14 28 15 28 18.5 C24 18.5 19 20 18 25 Z" fill="#5f4128"/>)
   :style==='bald'?(<><path d="M16.5 30 C15.5 21 16.5 16 20 14 C20.5 20 19.5 26 19.5 30 Z" fill="#6b4a30"/><path d="M47.5 30 C48.5 21 47.5 16 44 14 C43.5 20 44.5 26 44.5 30 Z" fill="#6b4a30"/><path d="M19 16 C23 13 41 13 45 16 C40 14.5 24 14.5 19 16 Z" fill="#6b4a30"/></>)
   :(<><path d="M17 24 C16 13 23 9 32 9 C41 9 48 13 47 24 C46 17 40 15 32 15 C24 15 18 17 17 24 Z" fill="#5a4632"/><path d="M17 23 C17 18 19 15 21 14 C20 18 20 21 19.5 24 Z" fill="#b7b1a6"/><path d="M47 23 C47 18 45 15 43 14 C44 18 44 21 44.5 24 Z" fill="#b7b1a6"/></>);
  return(<svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{flexShrink:0,filter:'drop-shadow(0 2px 4px rgba(0,0,0,.4))'}}>
    <path d="M9 64 Q9 48 24 44 L40 44 Q55 48 55 64 Z" fill={accent}/>
    <path d="M24 44 L32 52 L40 44 L40 47 L32 53 L24 47 Z" fill="#f4f1ea"/>
    <ellipse cx="32" cy="31" rx="15.5" ry="17.5" fill="#f6dccb"/>
    <circle cx="16.5" cy="31" r="3" fill="#f6dccb"/><circle cx="47.5" cy="31" r="3" fill="#f6dccb"/>
    {hair}
    <circle cx="25" cy="30" r="5.3" fill="#fff" fillOpacity="0.12" stroke="#2a2118" strokeWidth="1.6"/>
    <circle cx="39" cy="30" r="5.3" fill="#fff" fillOpacity="0.12" stroke="#2a2118" strokeWidth="1.6"/>
    <line x1="30.3" y1="30" x2="33.7" y2="30" stroke="#2a2118" strokeWidth="1.6"/>
    <circle cx="25" cy="30" r="1.7" fill="#2a2118"/><circle cx="39" cy="30" r="1.7" fill="#2a2118"/>
    <path d="M27.5 40 Q32 42.5 36.5 40" fill="none" stroke="#cf9a82" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>);
}
const BOTS=[
  {id:'pip',name:'Pip',elo:500,blurb:'Just learning. Makes friendly blunders you can pounce on.',accent:'#22a558',style:'balanced'},
  {id:'rosa',name:'Rosa',elo:900,blurb:'Casual club player. Plays for fun and the odd cheeky trap.',accent:'#e0992f',style:'attack'},
  {id:'milo',name:'Milo',elo:1300,blurb:'Steady improver. Punishes loose moves and hangs nothing.',accent:'#3b82f6',style:'solid'},
  {id:'astrid',name:'Astrid',elo:1900,blurb:'Sharp attacker. Keep your king safe or pay for it.',accent:'#a855f7',style:'attack'},
  {id:'viktor',name:'Viktor',elo:2350,blurb:'Master strength. Calm, precise, and brutal on a mistake.',accent:'#ef4444',style:'solid'},
];
const botById=(id)=>BOTS.find(b=>b.id===id)||null;
const botForElo=(e)=>BOTS.find(b=>b.elo===e)||null;
function _BotFace({id,size=46,style}){
  const b=botById(id); if(!b)return null; const ac=b.accent;
  const st={flexShrink:0,filter:'drop-shadow(0 2px 4px rgba(0,0,0,.4))',...(style||{})};
  const shirt=<path d="M10 64 Q10 49 25 45 L39 45 Q54 49 54 64 Z" fill={ac}/>;
  let inner=null;
  if(id==='pip')inner=<>{shirt}
    <ellipse cx="32" cy="32" rx="15" ry="16.5" fill="#f6d9c6"/>
    <circle cx="17" cy="32" r="2.8" fill="#f6d9c6"/><circle cx="47" cy="32" r="2.8" fill="#f6d9c6"/>
    <path d="M18 27 C17 14 24 11 32 11 C40 11 47 14 46 27 C44 20 39 18 32 18 C25 18 20 20 18 27 Z" fill="#7a4a28"/>
    <path d="M27 22 q5 -3 10 0" fill="none" stroke="#7a4a28" strokeWidth="2.4" strokeLinecap="round"/>
    <circle cx="26" cy="31" r="1.7" fill="#2a2118"/><circle cx="38" cy="31" r="1.7" fill="#2a2118"/>
    <circle cx="22" cy="36" r="2" fill="#f3a9a0" opacity="0.5"/><circle cx="42" cy="36" r="2" fill="#f3a9a0" opacity="0.5"/>
    <path d="M28 40 Q32 44 36 40" fill="none" stroke="#c98a72" strokeWidth="2" strokeLinecap="round"/></>;
  else if(id==='rosa')inner=<>{shirt}
    <ellipse cx="32" cy="8" rx="5" ry="4.5" fill="#3a2a1e"/>
    <ellipse cx="32" cy="32" rx="15" ry="16.5" fill="#e8b489"/>
    <circle cx="17" cy="32" r="2.8" fill="#e8b489"/><circle cx="47" cy="32" r="2.8" fill="#e8b489"/>
    <path d="M17 28 C16 15 23 11 32 11 C41 11 48 15 47 28 C45 19 40 17 32 17 C24 17 19 19 17 28 Z" fill="#3a2a1e"/>
    <circle cx="26" cy="31" r="1.7" fill="#2a2118"/><circle cx="38" cy="31" r="1.7" fill="#2a2118"/>
    <path d="M28 40 Q32 43.5 36 40" fill="none" stroke="#a96a4a" strokeWidth="2" strokeLinecap="round"/></>;
  else if(id==='milo')inner=<>{shirt}
    <ellipse cx="32" cy="32" rx="15" ry="16.5" fill="#c98a5e"/>
    <circle cx="17" cy="32" r="2.8" fill="#c98a5e"/><circle cx="47" cy="32" r="2.8" fill="#c98a5e"/>
    <path d="M16 25 Q14 17 18 14 Q19 9 24 10 Q26 6 31 9 Q35 6 39 9 Q44 9 45 13 Q49 16 47 25 Q45 19 41 18 Q42 14 38 15 Q39 11 34 13 Q32 10 29 13 Q25 12 25 16 Q20 16 19 20 Q17 21 16 25 Z" fill="#241a12"/>
    <circle cx="26" cy="31" r="4.6" fill="#fff" fillOpacity="0.12" stroke="#1d1610" strokeWidth="1.5"/>
    <circle cx="38" cy="31" r="4.6" fill="#fff" fillOpacity="0.12" stroke="#1d1610" strokeWidth="1.5"/>
    <line x1="30.6" y1="31" x2="33.4" y2="31" stroke="#1d1610" strokeWidth="1.5"/>
    <circle cx="26" cy="31" r="1.6" fill="#2a2118"/><circle cx="38" cy="31" r="1.6" fill="#2a2118"/>
    <path d="M28 40 Q32 43.5 36 40" fill="none" stroke="#8a5a3a" strokeWidth="2" strokeLinecap="round"/></>;
  else if(id==='astrid')inner=<>{shirt}
    <path d="M14 46 C11 26 16 9 32 8 C48 9 53 26 50 46 L44 46 C47 28 44 17 32 17 C20 17 17 28 20 46 Z" fill="#d9b25a"/>
    <ellipse cx="32" cy="32" rx="15" ry="16.5" fill="#f6d9c6"/>
    <path d="M17 27 C16 13 23 9 32 9 C41 9 48 13 47 27 C45 18 40 16 32 16 C24 16 19 18 17 27 Z" fill="#d9b25a"/>
    <circle cx="26" cy="31" r="1.7" fill="#2a2118"/><circle cx="38" cy="31" r="1.7" fill="#2a2118"/>
    <path d="M28 40 Q32 43.5 36 40" fill="none" stroke="#c98a72" strokeWidth="2" strokeLinecap="round"/></>;
  else if(id==='viktor')inner=<>{shirt}
    <ellipse cx="32" cy="32" rx="15" ry="16.5" fill="#eccbb4"/>
    <circle cx="17" cy="32" r="2.8" fill="#eccbb4"/><circle cx="47" cy="32" r="2.8" fill="#eccbb4"/>
    <path d="M19 41 Q20 49 32 50 Q44 49 45 41 Q44 45 32 46 Q20 45 19 41 Z" fill="#cdbfae" fillOpacity="0.7"/>
    <path d="M19 23 C19 15 25 12 32 12 C39 12 45 15 45 23 C44 19 39 18 32 18 C25 18 20 19 19 23 Z" fill="#c2c2c6"/>
    <circle cx="26" cy="31" r="4.6" fill="#fff" fillOpacity="0.12" stroke="#2a2118" strokeWidth="1.5"/>
    <circle cx="38" cy="31" r="4.6" fill="#fff" fillOpacity="0.12" stroke="#2a2118" strokeWidth="1.5"/>
    <line x1="30.6" y1="31" x2="33.4" y2="31" stroke="#2a2118" strokeWidth="1.5"/>
    <circle cx="26" cy="31" r="1.6" fill="#2a2118"/><circle cx="38" cy="31" r="1.6" fill="#2a2118"/>
    <path d="M28 41 Q32 43 36 41" fill="none" stroke="#9c6240" strokeWidth="1.8" strokeLinecap="round"/></>;
  return(<svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={st}>{inner}</svg>);
}
function PawnGlyph({idp='p',style}){
  return(<svg viewBox="0 0 48 58" aria-hidden="true" style={style}>
    <defs>
      <radialGradient id={'hd'+idp} cx="38%" cy="30%" r="75%"><stop offset="0" stopColor="#fffaf0"/><stop offset="0.55" stopColor="#f0dcb4"/><stop offset="1" stopColor="#bf9a5c"/></radialGradient>
      <linearGradient id={'bd'+idp} x1="0.2" y1="0" x2="0.85" y2="1"><stop offset="0" stopColor="#fbf1da"/><stop offset="0.5" stopColor="#ecd6ac"/><stop offset="1" stopColor="#b6914f"/></linearGradient>
      <linearGradient id={'bs'+idp} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3e3bf"/><stop offset="1" stopColor="#a47e44"/></linearGradient>
    </defs>
    <g stroke="#5e431f" strokeWidth="0.8" strokeLinejoin="round">
      <ellipse cx="24" cy="49.5" rx="17" ry="5.2" fill={`url(#bs${idp})`}/>
      <rect x="11.5" y="44" width="25" height="5.5" rx="2.6" fill={`url(#bs${idp})`}/>
      <path d="M16 21 C12 27 12.5 35 17.5 44 H30.5 C35.5 35 36 27 32 21 Z" fill={`url(#bd${idp})`}/>
      <path d="M15.5 18.5 H32.5 L30 22 H18 Z" fill={`url(#bd${idp})`}/>
      <circle cx="24" cy="12" r="7.2" fill={`url(#hd${idp})`}/>
    </g>
    <ellipse cx="20.5" cy="9.5" rx="2.2" ry="2.8" fill="#fffdf6" opacity="0.55"/>
  </svg>);
}
// Matching 3D ivory/gold queen.
function QueenGlyph({idp='q',style}){
  return(<svg viewBox="0 0 56 66" aria-hidden="true" style={style}>
    <defs>
      <radialGradient id={'qh'+idp} cx="38%" cy="28%" r="80%"><stop offset="0" stopColor="#fffaf0"/><stop offset="0.55" stopColor="#f0dcb4"/><stop offset="1" stopColor="#bf9a5c"/></radialGradient>
      <linearGradient id={'qb'+idp} x1="0.2" y1="0" x2="0.85" y2="1"><stop offset="0" stopColor="#fbf1da"/><stop offset="0.5" stopColor="#ecd6ac"/><stop offset="1" stopColor="#b6914f"/></linearGradient>
      <linearGradient id={'qs'+idp} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3e3bf"/><stop offset="1" stopColor="#a47e44"/></linearGradient>
    </defs>
    <g stroke="#5e431f" strokeWidth="0.8" strokeLinejoin="round">
      <ellipse cx="28" cy="57.5" rx="19" ry="5.4" fill={`url(#qs${idp})`}/>
      <rect x="11.5" y="52" width="33" height="5.6" rx="2.7" fill={`url(#qs${idp})`}/>
      <path d="M19 31 C13 40 12.5 48 16 52 H40 C43.5 48 43 40 37 31 Z" fill={`url(#qb${idp})`}/>
      <path d="M20.5 28 H35.5 L33.5 31.5 H22.5 Z" fill={`url(#qb${idp})`}/>
      <path d="M17 28 L15 17 L21.5 23 L28 14 L34.5 23 L41 17 L39 28 Z" fill={`url(#qb${idp})`}/>
      <circle cx="15" cy="16.5" r="2.5" fill={`url(#qh${idp})`}/>
      <circle cx="28" cy="13" r="3" fill={`url(#qh${idp})`}/>
      <circle cx="41" cy="16.5" r="2.5" fill={`url(#qh${idp})`}/>
    </g>
    <ellipse cx="24" cy="35" rx="2" ry="3.4" fill="#fffdf6" opacity="0.4"/>
  </svg>);
}
// One-time intro played when the Home screen mounts: a queen drops in and topples a row of pawns.
function HomeIntro({big,compact,force}){
  const qH=compact?52:(big?84:64), qW=qH*56/66;
  const pH=compact?28:(big?40:32), pW=pH*48/58;
  const stageH=compact?92:(big?176:122), base=8;
  const offs=[-2.1,-0.85,0.85,2.1].map(m=>m*pW);
  const [go,setGo]=useState(false);
  useEffect(()=>{
    let fired=false,raf=0,t1=0;
    const vis=()=>(typeof document==='undefined')||!document.visibilityState||document.visibilityState==='visible';
    const fire=()=>{if(fired||!vis())return;fired=true;setGo(true);};
    raf=requestAnimationFrame(()=>requestAnimationFrame(fire));
    try{if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>requestAnimationFrame(fire));}catch(e){}
    t1=setTimeout(fire,900);
    const onVis=()=>{if(vis())fire();};
    const onShow=(ev)=>{if(ev&&ev.persisted){fired=false;setGo(false);requestAnimationFrame(()=>requestAnimationFrame(fire));}};
    try{document.addEventListener('visibilitychange',onVis);window.addEventListener('pageshow',onShow);}catch(e){}
    return ()=>{cancelAnimationFrame(raf);clearTimeout(t1);try{document.removeEventListener('visibilitychange',onVis);window.removeEventListener('pageshow',onShow);}catch(e){}};
  },[]);
  return(
    <div className="ct-intro" style={{position:'relative',width:'100%',height:stageH,marginBottom:big?6:2,overflow:'hidden',pointerEvents:'none'}}>
      <div style={{position:'absolute',left:'50%',bottom:base+1,width:qW*1.6,height:9,marginLeft:-(qW*1.6)/2,background:'radial-gradient(ellipse at center,rgba(0,0,0,.42),transparent 70%)',borderRadius:'50%'}}/>
      {offs.map((x,i)=>(
        <div key={i} className={go?(i<2?'ct-topl':'ct-topr'):undefined} style={{position:'absolute',left:'50%',bottom:base,width:pW,height:pH,marginLeft:x-pW/2,transformOrigin:'center bottom',animationDelay:`${1.95+i*0.1}s`}}>
          <PawnGlyph idp={'i'+i} style={{width:'100%',height:'100%',display:'block',filter:'drop-shadow(0 2px 3px rgba(0,0,0,.45))'}}/>
        </div>
      ))}
      <div className={go?'ct-qdrop':undefined} style={{position:'absolute',left:'50%',bottom:base,width:qW,height:qH,marginLeft:-qW/2,transformOrigin:'center bottom',opacity:go?undefined:0}}>
        <QueenGlyph idp="iq" style={{width:'100%',height:'100%',display:'block',filter:'drop-shadow(0 5px 8px rgba(0,0,0,.55)) drop-shadow(0 0 13px rgba(240,212,138,.45))'}}/>
      </div>
    </div>
  );
}

function NotationTrainer({light,dark}){
  const [tab,setTab]=useState('squares');
  const rnd=()=>({r:Math.floor(Math.random()*8),c:Math.floor(Math.random()*8)});
  const [tgt,setTgt]=useState(rnd);
  const [sc,setSc]=useState({right:0,total:0});
  const [flash,setFlash]=useState(null);
  const tap=(r,c)=>{if(flash)return;const ok=(r===tgt.r&&c===tgt.c);setFlash({r,c,ok});setSc(s=>({right:s.right+(ok?1:0),total:s.total+1}));setTimeout(()=>{setFlash(null);if(ok)setTgt(rnd());},700);};
  const name=(r,c)=>FILES[c]+(8-r);
  const MQ=[{m:'Nf3',a:'Knight to f3'},{m:'exd5',a:'Pawn on the e-file captures on d5'},{m:'O-O',a:'Castle kingside'},{m:'Qxh7#',a:'Queen captures h7, checkmate'},{m:'e8=Q',a:'A pawn promotes to a queen on e8'}];
  const MO={'Nf3':['Knight to f3','Pawn to f3','Bishop to f3'],'exd5':['Pawn on the e-file captures on d5','King takes d5','Rook to d5'],'O-O':['Castle kingside','Castle queenside','Offer a draw'],'Qxh7#':['Queen captures h7, checkmate','Queen to h7, check','King takes h7'],'e8=Q':['A pawn promotes to a queen on e8','En passant on e8','Bishop to e8']};
  const [mi,setMi]=useState(0);const [mPick,setMPick]=useState(null);
  const mq=MQ[mi%MQ.length];const mopts=(()=>{const a=MO[mq.m].slice();for(let i=a.length-1;i>0;i--){const j=(mi*31+i*17+7)%(i+1);const t=a[i];a[i]=a[j];a[j]=t;}return a;})();
  const tabBtn=(k,lbl)=>(<button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'10px 4px',borderRadius:12,background:tab===k?'rgba(var(--acr),.22)':'rgba(255,255,255,.06)',border:tab===k?'1px solid var(--ac)':'1px solid rgba(255,255,255,.14)',color:tab===k?'var(--ac2)':'rgba(255,255,255,.8)',fontWeight:800,fontSize:'clamp(11px,2.5vw,13px)',cursor:'pointer'}}>{lbl}</button>);
  const pieceRow=(t,letter,desc)=>(<div key={t} style={{display:'flex',alignItems:'center',gap:11,padding:'8px 4px',borderBottom:'1px solid rgba(255,255,255,.08)'}}><span style={{width:30,textAlign:'center'}}><Piece t={t} color="w" sz={26}/></span><span style={{width:26,fontWeight:900,fontSize:18,color:'var(--ac2)',textAlign:'center'}}>{letter}</span><span style={{flex:1,fontSize:'clamp(11px,2.5vw,13.5px)',color:'rgba(255,255,255,.85)',lineHeight:1.4}}>{desc}</span></div>);
  const symRow=(s,desc)=>(<div key={s} style={{display:'flex',alignItems:'center',gap:11,padding:'7px 4px',borderBottom:'1px solid rgba(255,255,255,.08)'}}><span style={{minWidth:48,fontWeight:900,fontSize:15,color:'var(--ac2)',fontFamily:'monospace'}}>{s}</span><span style={{flex:1,fontSize:'clamp(11px,2.5vw,13.5px)',color:'rgba(255,255,255,.85)',lineHeight:1.4}}>{desc}</span></div>);
  return(<div style={{width:'100%',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    <div style={{textAlign:'center',marginBottom:12}}>
      <div style={{fontFamily:'var(--head)',fontSize:'clamp(19px,4.8vw,26px)',color:'#fff',fontWeight:700}}>Read chess notation</div>
      <div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'rgba(255,255,255,.5)',marginTop:3}}>Every square has a name, and every move is written down.</div>
    </div>
    <div style={{display:'flex',gap:6,marginBottom:12}}>{tabBtn('squares','Squares')}{tabBtn('pieces','Pieces')}{tabBtn('symbols','Symbols')}</div>
    {tab==='squares'&&(<div>
      <div style={{background:'rgba(var(--acr),.1)',border:'1px solid rgba(var(--acr),.3)',borderRadius:12,padding:'11px 13px',fontSize:'clamp(12px,2.7vw,14px)',color:'rgba(255,255,255,.9)',lineHeight:1.5,marginBottom:12}}>Files are the columns <b>a</b> to <b>h</b> (left to right from White's side). Ranks are the rows <b>1</b> to <b>8</b> (bottom to top). A square is its file then its rank, like <b style={{color:'var(--ac2)'}}>e4</b>.</div>
      <div style={{textAlign:'center',marginBottom:10,fontSize:'clamp(13px,3vw,16px)',fontWeight:800,color:'#fff'}}>Tap <span style={{color:'var(--ac2)',fontSize:'1.35em'}}>{name(tgt.r,tgt.c)}</span></div>
      <div style={{maxWidth:300,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(8,1fr)',borderRadius:4,overflow:'hidden',boxShadow:'0 0 0 2px #4a6741'}}>
        {Array.from({length:8}).map((_,r)=>Array.from({length:8}).map((__,c)=>{const lt=(r+c)%2===0;const fl=flash&&flash.r===r&&flash.c===c;const bg=fl?(flash.ok?'#52b788':'#e05a52'):(lt?light:dark);return(<div key={r+'-'+c} onClick={()=>tap(r,c)} style={{aspectRatio:'1',background:bg,position:'relative',cursor:'pointer'}}>
          {c===0&&<span style={{position:'absolute',top:1,left:2,fontSize:8,fontWeight:700,color:lt?'#6b8460':'#d4dccd',pointerEvents:'none'}}>{8-r}</span>}
          {r===7&&<span style={{position:'absolute',bottom:0,right:2,fontSize:8,fontWeight:700,color:lt?'#6b8460':'#d4dccd',pointerEvents:'none'}}>{FILES[c]}</span>}
        </div>);}))}
      </div>
      <div style={{textAlign:'center',marginTop:10,fontSize:'clamp(11px,2.5vw,13px)',color:'rgba(255,255,255,.65)'}}>Score {sc.right}/{sc.total}{sc.total>=5&&sc.right/sc.total>=0.8?' — nice eye!':''}</div>
    </div>)}
    {tab==='pieces'&&(<div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,padding:'6px 12px'}}>
      {pieceRow('k','K','King, the most important piece.')}
      {pieceRow('q','Q','Queen.')}
      {pieceRow('r','R','Rook.')}
      {pieceRow('b','B','Bishop.')}
      {pieceRow('n','N','Knight (N, because K is already taken).')}
      <div style={{display:'flex',alignItems:'center',gap:11,padding:'8px 4px'}}><span style={{width:30,textAlign:'center'}}><Piece t="p" color="w" sz={26}/></span><span style={{width:26,fontWeight:900,fontSize:18,color:'rgba(255,255,255,.4)',textAlign:'center'}}>—</span><span style={{flex:1,fontSize:'clamp(11px,2.5vw,13.5px)',color:'rgba(255,255,255,.85)',lineHeight:1.4}}>Pawns have no letter. Just write the square: <b style={{color:'var(--ac2)'}}>e4</b>.</span></div>
    </div>)}
    {tab==='symbols'&&(<div>
      <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,padding:'6px 12px',marginBottom:12}}>
        {symRow('x','Capture. Bxe5 = a bishop captures on e5. For a pawn, use its file: exd5.')}
        {symRow('+','Check. Qh5+.')}
        {symRow('#','Checkmate. Qh7#.')}
        {symRow('O-O','Castle kingside (short side).')}
        {symRow('O-O-O','Castle queenside (long side).')}
        {symRow('=Q','Promotion. e8=Q makes a new queen.')}
        {symRow('e.p.','En passant, a special pawn capture.')}
      </div>
      <div style={{background:'rgba(var(--acr),.1)',border:'1px solid rgba(var(--acr),.3)',borderRadius:12,padding:'12px 13px'}}>
        <div style={{fontSize:'clamp(12px,2.7vw,14px)',fontWeight:800,color:'#fff',marginBottom:9,textAlign:'center'}}>What does <span style={{color:'var(--ac2)',fontFamily:'monospace'}}>{mq.m}</span> mean?</div>
        <div style={{display:'flex',flexDirection:'column',gap:7}}>
          {mopts.map((o,i)=>{const picked=mPick===o;const right=o===mq.a;const show=mPick!=null;return(<button key={i} onClick={()=>{if(mPick==null)setMPick(o);}} style={{textAlign:'left',padding:'9px 12px',borderRadius:12,background:show&&right?'rgba(82,183,136,.22)':show&&picked&&!right?'rgba(224,90,82,.2)':'rgba(255,255,255,.06)',border:show&&right?'1px solid #52b788':show&&picked?'1px solid #e05a52':'1px solid rgba(255,255,255,.16)',color:'#fff',fontSize:'clamp(11px,2.5vw,13px)',cursor:mPick==null?'pointer':'default'}}>{o}{show&&right?'  ✓':''}</button>);})}
        </div>
        {mPick!=null&&(<button onClick={()=>{setMPick(null);setMi(i=>i+1);}} style={{marginTop:10,width:'100%',padding:'10px',borderRadius:12,background:'var(--ac)',border:'none',color:'#191919',fontWeight:800,fontSize:'clamp(12px,2.7vw,14px)',cursor:'pointer'}}>Next →</button>)}
      </div>
    </div>)}
  </div>);
}

const TACTICS=[
 {motif:'Fork',level:'Easy',fen:"6k1/3q1p1p/8/8/4N3/8/6K1/8 w - - 0 1",from:'e4',to:'f6',san:'Nf6+',idea:'White to play. One knight move hits two things at once.',hint:'A knight check that also lands next to the queen.',explain:'Nf6+ forks the king and queen. The king must move out of check, then you simply take the queen. Attacking two things at once is a fork.'},
 {motif:'Pin',level:'Easy',fen:"6k1/5p2/6n1/7P/8/8/8/1K4R1 w - - 0 1",from:'h5',to:'g6',san:'hxg6',idea:'White to play. The black knight is stuck. Why?',hint:'The rook pins the knight to its king, so the knight is not allowed to move.',explain:'The rook on g1 pins the knight to the king, so the knight cannot move. You attack it once more and win it: hxg6.'},
 {motif:'Skewer',level:'Easy',fen:"6q1/8/8/6k1/8/8/8/R6K w - - 0 1",from:'a1',to:'g1',san:'Rg1+',idea:'White to play. Line up the king and the queen.',hint:'Check the king down the g-file. Look what is behind it.',explain:'Rg1+ skewers the king and queen on the g-file. The king must step aside, then Rxg8 wins the queen. A skewer is a pin in reverse: the bigger piece is in front.'},
 {motif:'Discovered check',level:'Medium',fen:"4k3/3q4/8/4N3/8/8/8/4R1K1 w - - 0 1",from:'e5',to:'d7',san:'Nxd7+',idea:'White to play. Move one piece so another delivers check.',hint:'Move the knight, and the rook gives check down the e-file.',explain:'Nxd7+ grabs the queen and uncovers the rook check on the e-file at the same moment. The king is in check, so Black has no time to recapture. That is a discovered check.'},
 {motif:'Back-rank mate',level:'Easy',fen:"6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",from:'a1',to:'a8',san:'Ra8#',idea:'White to play. Mate in one.',hint:'The king is fenced in by its own pawns on the back rank.',explain:'Ra8# is checkmate. The f7, g7 and h7 pawns that shelter the king also trap it on the back rank, with no escape and nothing to block.'},
 {motif:'Smothered mate',level:'Medium',fen:"6rk/6pp/8/6N1/8/8/8/7K w - - 0 1",from:'g5',to:'f7',san:'Nf7#',idea:'White to play. Mate in one.',hint:'The king is boxed in by its own rook and pawns. Only a knight can reach it.',explain:'Nf7# is the smothered mate. The king is hemmed in by its own rook and pawns, so the knight check has no answer at all.'},
 {motif:'Double attack',level:'Medium',fen:"6k1/5pp1/1r5p/8/8/8/8/3Q2K1 w - - 0 1",from:'d1',to:'d8',san:'Qd8+',idea:'White to play. One queen move checks the king and hits a rook at the same time.',hint:'Check along the back rank, and notice what the queen also eyes on the long diagonal.',explain:'Qd8+ is a double attack: it checks the king and attacks the rook on b6 in one move. Black must answer the check with Kh7, then Qxb6 wins the rook. Hitting two things at once, with one of them a check, is the cleanest way to win material.'},
 {motif:'Pawn fork',level:'Easy',fen:"6k1/8/2n1b3/8/3P4/8/8/6K1 w - - 0 1",from:'d4',to:'d5',san:'d5',idea:'White to play. Push a humble pawn to attack two pieces at once.',hint:'A pawn on d5 would attack both the knight and the bishop.',explain:'d5 forks the knight on c6 and the bishop on e6. A pawn fork is the cheapest fork of all: the pawn is worth far less than either piece, so whichever one moves, you simply take the other.'},
 {motif:'Double check',level:'Medium',fen:"4k1q1/8/8/8/4N3/8/8/4R2K w - - 0 1",from:'e4',to:'f6',san:'Nf6+',idea:'White to play. Move the knight so two pieces check the king together.',hint:'Land the knight on f6: the knight checks the king, and the rook checks down the e-file behind it.',explain:'Nf6+ is a double check, from the knight and the rook at the same moment. You cannot block or capture two checkers at once, so the king is forced to move, and then Nxg8 scoops the queen.'},
 {motif:'Hanging piece',level:'Easy',fen:"6k1/1b3ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1",from:'b1',to:'b7',san:'Rxb7',idea:'White to play. Black has left a piece undefended. Take it.',hint:'Look at the bishop on b7. What is guarding it?',explain:'Rxb7 wins a whole bishop for free, because nothing defends it. Before every move, scan for what your opponent left undefended: a hanging piece is the single most common way games are won and lost.'},
];
const STRAT=[
 {title:'Control the centre',fen:"r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3",text:'Pawns and pieces in the centre control the most squares and give your army room to move. Here White has built a broad pawn centre on d4 and e4.',look:'Big pawn centre on d4 and e4.'},
 {title:'Develop and castle early',fen:"rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4",text:'Get your knights and bishops out, then tuck your king away by castling, all before you go hunting. White is developed and castled; Black still has work to do.',look:'Pieces out, king safely castled on g1.'},
 {title:'Put rooks on open files',fen:"2r3k1/pp3ppp/8/8/8/8/PP3PPP/2R3K1 w - - 0 1",text:'An open file has no pawns on it, so it is a highway for your rooks. Owning it lets a rook invade deep into the enemy camp.',look:'Rook on the open c-file.'},
 {title:'Knights love outposts',fen:"4k3/pp3ppp/8/3N4/4P3/8/PP3P1P/4K3 w - - 0 1",text:'An outpost is a square your knight can sit on where no enemy pawn can chase it away, ideally guarded by one of your own pawns. The d5 knight here is a monster.',look:'Knight on d5, backed by the e4 pawn.'},
 {title:'The bishop pair',fen:"4k3/pp3ppp/8/8/8/8/PP1B1PPP/2B1K3 w - - 0 1",text:'Two bishops cover squares of both colours and rake an open position from a distance. Holding on to both of them is a small but lasting edge.',look:'White keeps both bishops.'},
 {title:'King safety first',fen:"r4rk1/pp3ppp/8/8/8/8/PP3PPP/4K2R w K - 0 1",text:'A castled king behind three healthy pawns is hard to get at; a king stuck in the centre is a target. Black is tucked away here, while White has not castled yet.',look:'Black is castled and shielded; White is still in the middle.'},
 {title:'Rooks love the 7th rank',fen:"6k1/R4ppp/8/8/8/8/5PPP/6K1 w - - 0 1",text:'A rook on the 7th rank attacks the enemy pawns from behind and pins the king to the back rank. A pair of rooks there can be decisive. Aim to plant a rook on the 7th whenever a file opens toward it.',look:'White rook on a7, raking the pawns.'},
 {title:'Passed pawns must be pushed',fen:"6k1/5ppp/8/3P4/8/8/5PPP/6K1 w - - 0 1",text:'A passed pawn has no enemy pawn in front of it or on the files beside it, so nothing can stop it the normal way. Push it: every step closer to promotion ties the enemy down.',look:'The d5 pawn has a clear run to queen.'},
 {title:'Trade pieces when you are ahead',fen:"6k1/5ppp/8/8/8/8/5PPP/3Q1RK1 w - - 0 1",text:'When you are up material, swap pieces, not pawns. Fewer pieces on the board lets your extra material decide the game and gives the other side less to play with. When you are behind, do the opposite and keep pieces on.',look:'White is well ahead, so simplify toward the win.'},
 {title:'Keep your queen home early',fen:"rnb1kbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2",text:'Bringing the queen out in the first few moves looks aggressive, but the opponent develops by attacking her and gains time. Get your knights and bishops out first, castle, and let the queen come later.',look:'The lone queen on h5 will just be chased around.'},
 {title:'Doubled pawns are a weakness',fen:"6k1/5p1p/8/8/8/5P2/5P1P/6K1 w - - 0 1",text:'Two pawns stacked on the same file cannot defend each other and no longer form a healthy chain. They are often weak in the endgame. Avoid creating your own, and try to saddle your opponent with them.',look:'White has doubled f-pawns that cannot support each other.'},
 {title:'A knight on the rim is dim',fen:"4k3/8/8/8/8/N7/8/4K3 w - - 0 1",text:'A knight in the centre can reach up to eight squares; a knight on the edge reaches only four, and in the corner just two. Develop your knights toward the middle, not out to the side.',look:'The a3 knight is stuck on the edge with little to do.'},
];
function TacticsTrainer({light,dark}){
  const [tab,setTab]=useState('motifs');
  const [mi,setMi]=useState(0);
  const [sel,setSel]=useState(null);
  const [solved,setSolved]=useState(false);
  const [shown,setShown]=useState(false);
  const [wrong,setWrong]=useState(false);
  const [showHint,setShowHint]=useState(false);
  const [si,setSi]=useState(0);
  const cur=TACTICS[mi%TACTICS.length];
  const pos=fromFEN(cur.fen);
  const nextM=()=>{setMi(i=>(i+1)%TACTICS.length);setSel(null);setSolved(false);setShown(false);setWrong(false);setShowHint(false);};
  const alg=(r,c)=>FILES[c]+(8-r);
  const fromRC=[8-(+cur.from[1]),FILES.indexOf(cur.from[0])];
  const toRC=[8-(+cur.to[1]),FILES.indexOf(cur.to[0])];
  const tap=(r,c)=>{
    if(solved||shown)return;
    const p=pos.board[r][c];
    if(sel){
      if(p&&p.c==='w'){setSel([r,c]);setWrong(false);return;}
      const f=alg(sel[0],sel[1]),t=alg(r,c);
      if(f===cur.from&&t===cur.to){setSolved(true);setWrong(false);}
      else{setWrong(true);setSel(null);}
    } else if(p&&p.c==='w'){setSel([r,c]);setWrong(false);}
  };
  const hiFrom=(solved||shown)?fromRC:sel;
  const hiTo=(solved||shown)?toRC:null;
  const doneM=solved||shown;
  const dispBoard=doneM?applyMove(pos.board,{fr:fromRC[0],fc:fromRC[1],tr:toRC[0],tc:toRC[1]}):pos.board;
  const cell=(r,c)=>{
    const lt=(r+c)%2===0;const p=dispBoard[r][c];
    const isFrom=hiFrom&&hiFrom[0]===r&&hiFrom[1]===c;
    const isTo=hiTo&&hiTo[0]===r&&hiTo[1]===c;
    let bg=lt?light:dark; if(isFrom)bg='#d8b24a'; if(isTo)bg='#52b788';
    return(<div key={r+'-'+c} onClick={()=>tap(r,c)} style={{aspectRatio:'1',background:bg,position:'relative',cursor:doneM?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
      {c===0&&<span style={{position:'absolute',top:1,left:2,fontSize:9,fontWeight:700,color:lt?'#6b8460':'#d4dccd',pointerEvents:'none'}}>{8-r}</span>}
      {r===7&&<span style={{position:'absolute',bottom:0,right:2,fontSize:9,fontWeight:700,color:lt?'#6b8460':'#d4dccd',pointerEvents:'none'}}>{FILES[c]}</span>}
      {p&&<span style={isTo&&doneM?{animation:'iconpop .45s cubic-bezier(.34,1.56,.64,1) both'}:undefined}><Piece t={p.t} color={p.c} sz={37}/></span>}
    </div>);
  };
  const tabBtn=(k,lbl)=>(<button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'10px 4px',borderRadius:12,background:tab===k?'rgba(var(--acr),.22)':'rgba(255,255,255,.06)',border:tab===k?'1px solid var(--ac)':'1px solid rgba(255,255,255,.14)',color:tab===k?'var(--ac2)':'rgba(255,255,255,.8)',fontWeight:800,fontSize:'clamp(11px,2.5vw,13px)',cursor:'pointer'}}>{lbl}</button>);
  const cstr=STRAT[si%STRAT.length];const spos=fromFEN(cstr.fen);
  const scell=(r,c)=>{const lt=(r+c)%2===0;const p=spos.board[r][c];return(<div key={r+'-'+c} style={{aspectRatio:'1',background:lt?light:dark,position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>{c===0&&<span style={{position:'absolute',top:1,left:2,fontSize:9,fontWeight:700,color:lt?'#6b8460':'#d4dccd'}}>{8-r}</span>}{r===7&&<span style={{position:'absolute',bottom:0,right:2,fontSize:9,fontWeight:700,color:lt?'#6b8460':'#d4dccd'}}>{FILES[c]}</span>}{p&&<Piece t={p.t} color={p.c} sz={37}/>}</div>);};
  return(<div style={{width:'100%',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    <div style={{textAlign:'center',marginBottom:12}}>
      <div style={{fontFamily:'var(--head)',fontSize:'clamp(19px,4.8vw,26px)',color:'#fff',fontWeight:700}}>Tactics & Strategy</div>
      <div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'rgba(255,255,255,.5)',marginTop:3}}>The patterns that win games, and the ideas behind good moves.</div>
    </div>
    <div style={{display:'flex',gap:6,marginBottom:12}}>{tabBtn('motifs','Tactics')}{tabBtn('strategy','Strategy')}</div>
    {tab==='motifs'&&(<div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <span style={{fontSize:'clamp(14px,3.3vw,17px)',fontWeight:800,color:'#fff'}}>{cur.motif}</span>
        <span style={{fontSize:'clamp(9.5px,2.1vw,11px)',color:'var(--ac2)',fontWeight:700,background:'rgba(var(--acr),.16)',border:'1px solid rgba(var(--acr),.3)',borderRadius:20,padding:'2px 10px'}}>{cur.level} · {(mi%TACTICS.length)+1}/{TACTICS.length}</span>
      </div>
      <div style={{background:'rgba(var(--acr),.1)',border:'1px solid rgba(var(--acr),.3)',borderRadius:11,padding:'11px 13px',fontSize:'clamp(12.5px,2.9vw,15px)',color:'rgba(255,255,255,.9)',lineHeight:1.5,marginBottom:11}}>{cur.idea}</div>
      <div style={{maxWidth:400,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(8,1fr)',borderRadius:4,overflow:'hidden',boxShadow:'0 0 0 2px #4a6741'}}>
        {Array.from({length:8}).map((_,r)=>Array.from({length:8}).map((__,c)=>cell(r,c)))}
      </div>
      <div style={{minHeight:24,textAlign:'center',margin:'10px 0 4px'}}>
        {solved?<span style={{color:'#6fce97',fontWeight:800,fontSize:'clamp(12px,2.8vw,14px)'}}>✓ {cur.san} — correct!</span>
         :shown?<span style={{color:'var(--ac2)',fontWeight:800,fontSize:'clamp(12px,2.8vw,14px)'}}>Answer: {cur.san}</span>
         :wrong?<span style={{color:'#f0a24e',fontWeight:700,fontSize:'clamp(11.5px,2.6vw,13px)'}}>Not the key move — try again.</span>
         :sel?<span style={{color:'rgba(255,255,255,.6)',fontSize:'clamp(11px,2.5vw,12.5px)'}}>Now tap where it goes.</span>
         :<span style={{color:'rgba(255,255,255,.6)',fontSize:'clamp(11px,2.5vw,12.5px)'}}>Tap the piece to move.</span>}
      </div>
      {(solved||shown)&&<div style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.14)',borderRadius:11,padding:'11px 13px',fontSize:'clamp(11.5px,2.6vw,13.5px)',color:'rgba(255,255,255,.88)',lineHeight:1.5,marginBottom:10}}>{cur.explain}</div>}
      {showHint&&!solved&&!shown&&<div style={{textAlign:'center',color:'rgba(255,255,255,.7)',fontSize:'clamp(11px,2.5vw,12.5px)',marginBottom:10}}>💡 {cur.hint}</div>}
      <div style={{display:'flex',gap:8}}>
        {!solved&&!shown&&<button onClick={()=>setShowHint(h=>!h)} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.16)',color:'rgba(255,255,255,.85)',fontWeight:700,fontSize:'clamp(11px,2.5vw,13px)',cursor:'pointer'}}>Hint</button>}
        {!solved&&!shown&&<button onClick={()=>{setShown(true);setSel(null);}} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.16)',color:'rgba(255,255,255,.85)',fontWeight:700,fontSize:'clamp(11px,2.5vw,13px)',cursor:'pointer'}}>Show answer</button>}
        {(solved||shown)&&<button onClick={nextM} style={{flex:1,padding:'10px',borderRadius:10,background:'var(--ac)',border:'none',color:'#191919',fontWeight:800,fontSize:'clamp(12px,2.7vw,14px)',cursor:'pointer'}}>Next motif →</button>}
      </div>
    </div>)}
    {tab==='strategy'&&(<div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <span style={{fontSize:'clamp(13px,3vw,16px)',fontWeight:800,color:'#fff'}}>{cstr.title}</span>
        <span style={{fontSize:'clamp(9.5px,2.1vw,11px)',color:'var(--ac2)',fontWeight:700,background:'rgba(var(--acr),.16)',border:'1px solid rgba(var(--acr),.3)',borderRadius:20,padding:'2px 10px'}}>{(si%STRAT.length)+1}/{STRAT.length}</span>
      </div>
      <div style={{maxWidth:400,margin:'0 auto 11px',display:'grid',gridTemplateColumns:'repeat(8,1fr)',borderRadius:4,overflow:'hidden',boxShadow:'0 0 0 2px #4a6741'}}>
        {Array.from({length:8}).map((_,r)=>Array.from({length:8}).map((__,c)=>scell(r,c)))}
      </div>
      <div style={{background:'rgba(var(--acr),.1)',border:'1px solid rgba(var(--acr),.3)',borderRadius:11,padding:'9px 12px',fontSize:'clamp(11px,2.5vw,12.5px)',color:'var(--ac2)',fontWeight:700,textAlign:'center',marginBottom:9}}>👀 {cstr.look}</div>
      <div style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.14)',borderRadius:11,padding:'11px 13px',fontSize:'clamp(11.5px,2.6vw,13.5px)',color:'rgba(255,255,255,.88)',lineHeight:1.5,marginBottom:11}}>{cstr.text}</div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setSi(i=>(i-1+STRAT.length)%STRAT.length)} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.16)',color:'rgba(255,255,255,.85)',fontWeight:700,fontSize:'clamp(12px,2.7vw,14px)',cursor:'pointer'}}>‹ Prev</button>
        <button onClick={()=>setSi(i=>(i+1)%STRAT.length)} style={{flex:1,padding:'10px',borderRadius:10,background:'var(--ac)',border:'none',color:'#191919',fontWeight:800,fontSize:'clamp(12px,2.7vw,14px)',cursor:'pointer'}}>Next ›</button>
      </div>
    </div>)}
  </div>);
}

// Achievements: unlocked permanently once their test passes against the player's stats.
const ACHV=[
  {id:'pz1',ic:'🧩',name:'First Solve',desc:'Solve your first puzzle',test:s=>s.pz>=1},
  {id:'pz25',ic:'🎯',name:'Sharp Eye',desc:'Solve 25 puzzles',test:s=>s.pz>=25},
  {id:'pz100',ic:'🏆',name:'Tactician',desc:'Solve 100 puzzles',test:s=>s.pz>=100},
  {id:'streak10',ic:'🔥',name:'On a Roll',desc:'Reach a 10-in-a-row puzzle streak',test:s=>s.bestStreak>=10},
  {id:'day3',ic:'📅',name:'Habit Forming',desc:'Keep a 3-day daily streak',test:s=>s.streak>=3},
  {id:'op1',ic:'📚',name:'Student',desc:'Learn your first opening',test:s=>s.learned>=1},
  {id:'op5',ic:'🧠',name:'Theorist',desc:'Learn 5 openings',test:s=>s.learned>=5},
  {id:'rv1',ic:'🔍',name:'Self-Aware',desc:'Review your first game',test:s=>s.reviewed>=1},
  {id:'rv10',ic:'📊',name:'Analyst',desc:'Review 10 of your games',test:s=>s.reviewed>=10},
  {id:'br1',ic:'💎',name:'Brilliant!',desc:'Play a brilliant move in a reviewed game',test:s=>s.bril>=1},
];

const Arrows=memo(_Arrows),Piece=memo(_Piece),AppIcon=memo(_AppIcon),Coach=memo(_Coach),BotFace=memo(_BotFace);
export default function App(){
  const [mode,setMode]=useState('learn');
  const [infoOpen,setInfoOpen]=useState(false);
  const [introCard,setIntroCard]=useState(false);
  const [copyMsg,setCopyMsg]=useState('');
  const [theme,setTheme]=useState(()=>{try{const v=localStorage.getItem('ct_theme');return v!==null?parseInt(v):2;}catch{return 2;}});
  const [testPro,setTestPro]=useState(()=>{try{return localStorage.getItem('ct_pro')==='1';}catch{return false;}});  // dev/test Pro override
  const [subPro,setSubPro]=useState(false);   // real Pro entitlement from Stripe (firestore-stripe-payments extension)
  const isPro = subPro || testPro;             // effective Pro = a live subscription OR the test override
  const [skin,setSkin]=useState(()=>{try{const v=localStorage.getItem('ct_skin');const i=v!==null?parseInt(v):CLASSIC_IDX;return (i>=0&&i<SKINS.length)?i:CLASSIC_IDX;}catch{return CLASSIC_IDX;}});
  const [introN,setIntroN]=useState(0);  // bump to replay the Home intro animation
  const [homeScreen,setHomeScreen]=useState(true);
  const [themeOpen,setThemeOpen]=useState(false);
  const [skinOpen,setSkinOpen]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [boardDepth,setBoardDepth]=useState(()=>{try{return localStorage.getItem('ct_depth')==='1';}catch{return false;}});
  const cyclingRef=useRef(false);
  const [learnCat,setLearnCat]=useState(null);
  const [learnGroup,setLearnGroup]=useState(null);
  const skEff=(SKINS[skin]&&SKINS[skin].pro&&!isPro)?CLASSIC_IDX:skin;
  const SK=SKINS[skEff]||SKINS[CLASSIC_IDX]||SKINS[0];
  const TH=THEMES[theme]||THEMES[2];
  const headFont=SK.font;
  const baseBg=SK.bgc||TH.bg;
  const appBgImg=(SK.tex?SK.tex+',':'')+`radial-gradient(ellipse at 50% 0%,${TH.glow} 0%,transparent 62%)`;
  useEffect(()=>{try{document.documentElement.style.background=baseBg;document.body.style.background=baseBg;const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',baseBg);}catch(e){}},[baseBg]);
  const [game,setGame]=useState(initGame);
  const [flip,setFlip]=useState(false);
  const [lastMv,setLastMv]=useState(null);
  const [fallback,setFallback]=useState(false);
  const onPieceFail=useCallback(()=>setFallback(true),[]);

  // Play
  const [opponent,setOpponent]=useState('computer');
  const [onlineGame,setOnlineGame]=useState(null);   // Firestore game doc {id,code,status,moves,result,chat,w,b}
  const [myColor,setMyColor]=useState(null);          // 'w' | 'b' in an online game
  const [onlineErr,setOnlineErr]=useState('');
  const [onlineInfo,setOnlineInfo]=useState('');
  const [mmSearching,setMmSearching]=useState(false);  // quick-match in progress
  const [onlineCodeInput,setOnlineCodeInput]=useState('');
  const [chatInput,setChatInput]=useState('');
  const [pendingJoin,setPendingJoin]=useState(()=>{try{const u=new URL(window.location.href);return (u.searchParams.get('g')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)||null;}catch(e){return null;}});
  const [confirmResign,setConfirmResign]=useState(false);
  const [myGames,setMyGames]=useState(null);        // user's ongoing/recent online games (account-based)
  const [myGamesLoading,setMyGamesLoading]=useState(false);
  const [corrNow,setCorrNow]=useState(Date.now());  // ticks so "time left" labels refresh
  const [liveNow,setLiveNow]=useState(Date.now());  // fast tick for the live online clock
  const [cpuElo,setCpuElo]=useState(()=>{try{const v=localStorage.getItem('ct_elo');return v!==null?parseInt(v):800;}catch{return 800;}});          // adaptive strength; nudged by results
  const [selBot,setSelBot]=useState(()=>{try{return localStorage.getItem('ct_bot')||null;}catch{return null;}});   // chosen named opponent
  const [coachStyle,setCoachStyle]=useState(()=>{try{return localStorage.getItem('ct_coachstyle')||'comb';}catch{return 'comb';}});   // coach look A/B/C/D
  const [cloudUser,setCloudUser]=useState(null);   // {uid,name,email,photo} when signed in (deployed app only)
  const [acctOpen,setAcctOpen]=useState(false);    // account panel (opened from the Home avatar)
  const [upgradeMsg,setUpgradeMsg]=useState('');   // upgrade-flow feedback (payments not wired yet)
  const [cloudAvail,setCloudAvail]=useState(false);// true when the Firebase bridge is present
  const [cloudErr,setCloudErr]=useState('');
  const syncRef=useRef({theme:2,elo:800,skin:0});         // latest values for first-sign-in push
  const [eloMsg,setEloMsg]=useState('');            // "▲ Strength now ~840 Elo" feedback
  const eloDoneRef=useRef(false);                   // ensure one Elo update per game
  const sfRef=useRef(null);                         // Stockfish web worker
  const sfReadyRef=useRef(false);                   // worker responded readyok
  const sfCbRef=useRef(null);                       // pending bestmove callback
  const sfCandRef=useRef(null);                     // collects the engine's top lines during a personality bot's move search
  const sfAnaRef=useRef(null);                      // dedicated Stockfish worker for game review analysis (separate from play/eval-bar)
  const sfAnaReadyRef=useRef(false);
  const sfAnaCbRef=useRef(null);                    // {score,best} handlers for the in-flight analysis eval
  const sfEvalingRef=useRef(false);                 // a full-strength eval search is running (vs a move search)
  const sfEvalFenRef=useRef('');                    // the fen the pending eval search is for
  const [sfReady,setSfReady]=useState(false);       // worker ready (state, to retrigger the eval effect)
  const [sfEval,setSfEval]=useState(null);          // {cp,mate,fen} from White's POV, or null
  const [hideEval,setHideEval]=useState(()=>{try{return localStorage.getItem('ct_hideEval')==='1';}catch{return false;}});
  const [soundOn,setSoundOn]=useState(()=>{try{return localStorage.getItem('ct_sound')!=='0';}catch{return true;}});
  const _sfxLastRef=useRef('');
  const [playEnd,setPlayEnd]=useState(null);        // null | {reason:'resign'|'time', winner:'w'|'b'}
  const playEndRef=useRef(null);
  const [timeCtrl,setTimeCtrl]=useState(null);      // null | {label,init,inc}
  const [playSetup,setPlaySetup]=useState(false);   // pre-game setup screen shown when entering Play
  const [soonMsg,setSoonMsg]=useState('');   // 'coming soon' note for Play-with-friends / Tournaments tiles
  const [setupFromFEN,setSetupFromFEN]=useState(null); // when set, the next game starts from this position (e.g. "Play from here" in Review)
  const [scanBusy,setScanBusy]=useState(false);
  const [scanMsg,setScanMsg]=useState('');
  const scanInputRef=useRef(null);
  const timeCtrlRef=useRef(null);
  const [clock,setClock]=useState({w:0,b:0,run:false}); // ms remaining; run starts after move 1
  const [playHist,setPlayHist]=useState([]);
  const [pvIdx,setPvIdx]=useState(null);          // live-game move viewer: null=live, else position index (after N moves)
  const pvIdxRef=useRef(null);
  const [lpv,setLpv]=useState(null);
  const [sqShow,setSqShow]=useState(false);
  const lpvRef=useRef(null);
  const [playHintMv,setPlayHintMv]=useState(null);
  const [pColor,setPColor]=useState('w');
  const [thinking,setThinking]=useState(false);

  // Learn
  const [openIdx,setOpenIdx]=useState(null);
  const [openStep,setOpenStep]=useState(0);
  const [openMsg,setOpenMsg]=useState('');
  const [showHint,setShowHint]=useState(true);
  const [revealHint,setRevealHint]=useState(false);
  const [learnProg,setLearnProg]=useState(()=>{try{return JSON.parse(localStorage.getItem('ct_learnprog')||'{}')||{};}catch(e){return {};}});
  const learnProgRef=useRef(learnProg); learnProgRef.current=learnProg;
  const learnRepRef=useRef({hints:false,miss:false});
  const learnKeyRef=useRef('');
  const [celebrate,setCelebrate]=useState(null);
  const [preview,setPreview]=useState(false);
  const [recCap,setRecCap]=useState(null);
  const [diagMsg,setDiagMsg]=useState("");
  const [shareMsg,setShareMsg]=useState("");
  const errLogRef=useRef([]);
  const diagRef=useRef({});
  const postReport=(kind,payload)=>{if(!LOG_ENDPOINT)return;try{fetch(LOG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,t:Date.now(),build:BUILD_INFO,...payload})}).catch(()=>{});}catch(e){}};
  const collectDiagnostics=()=>{let d={...diagRef.current};try{d.ua=navigator.userAgent;d.innerW=window.innerWidth;d.innerH=window.innerHeight;d.scrollH=document.documentElement.scrollHeight;d.overflow=document.documentElement.scrollHeight>window.innerHeight+4;}catch(e){}d.errs=errLogRef.current.slice(-10);return JSON.stringify(d,null,2);};
  useEffect(()=>{
    const push=(o)=>{const a=errLogRef.current;a.push(o);if(a.length>20)a.shift();return o;};
    const onErr=(e)=>{try{postReport('error',push({t:Date.now(),msg:String((e&&e.message)||'error').slice(0,200),src:String((e&&e.filename)||'').slice(-60),line:e&&e.lineno,col:e&&e.colno,stack:String((e&&e.error&&e.error.stack)||'').slice(0,500),screen:diagRef.current.screen||'',build:BUILD_INFO}));}catch(_){}};
    const onRej=(e)=>{try{const r=e&&e.reason;postReport('error',push({t:Date.now(),msg:String((r&&r.message)||r||'unhandledrejection').slice(0,200),stack:String((r&&r.stack)||'').slice(0,500),screen:diagRef.current.screen||'',build:BUILD_INFO}));}catch(_){}};
    window.addEventListener('error',onErr);window.addEventListener('unhandledrejection',onRej);
    if(LOG_ENDPOINT)setTimeout(()=>{try{postReport('open',JSON.parse(collectDiagnostics()));}catch(_){}},1500);
    return ()=>{window.removeEventListener('error',onErr);window.removeEventListener('unhandledrejection',onRej);};
  },[]);
  const [tourOpen,setTourOpen]=useState(false);
  const [tours,setTours]=useState([]);
  const [tourView,setTourView]=useState('list');
  const [tourSel,setTourSel]=useState(null);
  const [tourName,setTourName]=useState('');
  const [tourFmt,setTourFmt]=useState('roundrobin');
  const [tourWhen,setTourWhen]=useState('');
  const [tourBusy,setTourBusy]=useState(false);
  const [tourMsg,setTourMsg]=useState('');
  useEffect(()=>{if(celebrate&&celebrate.kind==='bank'){const t=setTimeout(()=>setCelebrate(null),2800);return ()=>clearTimeout(t);}},[celebrate]);
  useEffect(()=>{if(onlineInfo){const t=setTimeout(()=>setOnlineInfo(''),4500);return ()=>clearTimeout(t);}},[onlineInfo]);
  useEffect(()=>{const C=(typeof window!=='undefined')?window.CTCloud:null;if(!tourOpen||!C||!C.tourList)return;const un=C.tourList(a=>setTours(Array.isArray(a)?a:[]));return ()=>{try{un&&un();}catch(e){}};},[tourOpen]);
  const [coachTargets,setCoachTargets]=useState(()=>{try{const a=JSON.parse(localStorage.getItem('ct_coachtargets')||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}});
  const coachTargetsRef=useRef(coachTargets); coachTargetsRef.current=coachTargets;
  const hintLockRef=useRef((()=>{try{return JSON.parse(localStorage.getItem('ct_hintlock')||'{}')||{};}catch(e){return {};}})());
  const [coachPlanOpen,setCoachPlanOpen]=useState(false);
  const [coachPick,setCoachPick]=useState({side:'any',fm:'any',style:'any',kind:'any'});
  const [coachChooserOpen,setCoachChooserOpen]=useState(false);
  const [coachBrowseOpen,setCoachBrowseOpen]=useState(false);
  const [coachTier,setCoachTier]=useState(()=>{try{const t=JSON.parse(localStorage.getItem('ct_coachtier')||'null');if(t&&typeof t.cleared==='number'&&typeof t.swapsLeft==='number')return {swapAt:Date.now(),...t};}catch(e){}return {cleared:0,swapsLeft:2,swapAt:Date.now()};});
  const coachTierRef=useRef(coachTier); coachTierRef.current=coachTier;
  const hintPrefsRef=useRef(null);
  const [learnPhase,setLearnPhase]=useState('demo');
  const [learnSheet,setLearnSheet]=useState(false);
  const [trainTap,setTrainTap]=useState(()=>{try{return localStorage.getItem('ct_traintap')!=='0';}catch{return true;}});
  const [trainMastery,setTrainMastery]=useState(()=>{try{return JSON.parse(localStorage.getItem('ct_train')||'{}');}catch{return {};}});
  const [learnLine,setLearnLine]=useState([]);
  const [lastLesson,setLastLesson]=useState(()=>{try{const v=localStorage.getItem('ct_lastlesson');return v!==null&&v!==''?parseInt(v):null;}catch{return null;}});
  const [learnLabel,setLearnLabel]=useState('');
  const [demoPly,setDemoPly]=useState(0);
  const [demoPlaying,setDemoPlaying]=useState(false);
  const [learnNotes,setLearnNotes]=useState([]);
  const [fbMap,setFbMap]=useState(()=>{try{return JSON.parse(localStorage.getItem('ct_feedback')||'{}');}catch{return{};}});
  const [achv,setAchv]=useState(()=>{try{return JSON.parse(localStorage.getItem('ct_achv')||'[]');}catch{return[];}});
  const [achvOpen,setAchvOpen]=useState(false);
  const [friendsOpen,setFriendsOpen]=useState(false);
  const [friendsData,setFriendsData]=useState({incoming:[],friends:[]});
  const [friendIdInput,setFriendIdInput]=useState('');
  const [friendMsg,setFriendMsg]=useState('');
  const [nearbyOpen,setNearbyOpen]=useState(false);
  const [nearbyData,setNearbyData]=useState([]);
  const [nearbyGeo,setNearbyGeo]=useState(null);
  const [nearbyMsg,setNearbyMsg]=useState('');
  const [nearbyBusy,setNearbyBusy]=useState(false);
  const [nearbyZip,setNearbyZip]=useState('');
  const [fbOpen,setFbOpen]=useState(false); const [fbText,setFbText]=useState(''); const [fbSent,setFbSent]=useState(false); const [fbCopied,setFbCopied]=useState(false);
  const [learnPlans,setLearnPlans]=useState('');
  const [learnIdea,setLearnIdea]=useState('');
  const [learnArrows,setLearnArrows]=useState(null);
  const [learnVideo,setLearnVideo]=useState(null);
  const [learnFEN,setLearnFEN]=useState(null);
  const [showVideo,setShowVideo]=useState(false);
  const [videoOpen,setVideoOpen]=useState(false);

  // Analyze / Review
  const [pgnText,setPgnText]=useState('');
  const [chessUser,setChessUser]=useState(()=>{try{return localStorage.getItem('ct_ccuser')||'';}catch{return '';}});
  const [lichessUser,setLichessUser]=useState(()=>{try{return localStorage.getItem('ct_liuser')||'';}catch{return '';}});
  const [importSrc,setImportSrc]=useState(()=>{try{if(!localStorage.getItem('ct_ccuser')&&localStorage.getItem('ct_liuser'))return 'li';}catch{}return 'cc';});
  const [gameSearch,setGameSearch]=useState('');
  const ccRawRef=useRef(null),liRawRef=useRef(null),gamesAutoRef=useRef(false);
  const gameStatsRef=useRef((()=>{try{return JSON.parse(localStorage.getItem('ct_gamestats')||'{}')||{};}catch{return {};}})());  // gkey -> {bril,great,inacc,mist,blun}
  const [gsVer,setGsVer]=useState(0);   // bump to re-render game rows as background stats fill in
  const analyzingRef=useRef(false);
  const recordGameStats=(k,v)=>{gameStatsRef.current={...gameStatsRef.current,[k]:v};try{localStorage.setItem('ct_gamestats',JSON.stringify(gameStatsRef.current));}catch{}setGsVer(x=>x+1);};
  const [ccGames,setCcGames]=useState(null);
  const gamesListRef=useRef(null);
  const [ccErr,setCcErr]=useState('');
  const [ccLoading,setCcLoading]=useState(false);
  const [review,setReview]=useState(null);
  const [reviewView,setReviewView]=useState('moves');
  const [lastReview,setLastReview]=useState(null);
  const [myBrilliant,setMyBrilliant]=useState(()=>{try{const v=localStorage.getItem('ct_mybrilliancies');return v?JSON.parse(v):[];}catch{return [];}});
  const [ply,setPly]=useState(0);
  const [revAuto,setRevAuto]=useState(false);
  const [analyzing,setAnalyzing]=useState(false);
  const [progress,setProgress]=useState(0);
  const [pgnErr,setPgnErr]=useState('');
  const [showBest,setShowBest]=useState(false);
  const [vw,setVw]=useState(()=>Math.min(typeof window!=='undefined'?(window.innerWidth||360):360,760));
  const [vp,setVp]=useState(()=>({w:typeof window!=='undefined'?(window.innerWidth||360):360,h:typeof window!=='undefined'?(window.innerHeight||800):800}));
  const [anim,setAnim]=useState(null);      // {piece, from:[r,c], to:[r,c]} during a glide
  const [animTo,setAnimTo]=useState(false); // false=at source, true=transition to target

  // Puzzles
  const [puzIdx,setPuzIdx]=useState(0);
  const [puzStep,setPuzStep]=useState(0);
  const [puzMsg,setPuzMsg]=useState('');
  const [puzSolved,setPuzSolved]=useState(false);
  const [puzReveal,setPuzReveal]=useState(false);
  const [puzDone,setPuzDone]=useState({});
  const [puzSide,setPuzSide]=useState('w');
  // ── Roadmap / progression ──
  const [pzView,setPzView]=useState('roadmap');
  const [pzBurst,setPzBurst]=useState(0);     // 'roadmap' | 'browse'
  const [pzSolvedMap,setPzSolvedMap]=useState({});  // puzzle id -> 1
  const [pzStreak,setPzStreak]=useState(0);
  const [pzBest,setPzBest]=useState(0);
  const [pzXP,setPzXP]=useState(0);
  const [pzTrainTier,setPzTrainTier]=useState(null);
  const [pzUnlock,setPzUnlock]=useState(false);     // PIN-unlocked: all tiers trainable
  const [pzPin,setPzPin]=useState('');              // PIN input box
  const [pzPinErr,setPzPinErr]=useState('');
  const [curPuz,setCurPuz]=useState(null);          // puzzle currently on the board (roadmap or external)
  const [myMistakes,setMyMistakes]=useState(()=>{try{const v=localStorage.getItem('ct_mymistakes');return v?JSON.parse(v):[];}catch{return [];}});
  const [mistakeMode,setMistakeMode]=useState(false); // practicing your own mistakes (uses the puzzle player, bypasses the puzzle paywall)
  const myMistakesRef=useRef([]); const mistakeQueueRef=useRef([]); const mistakeIdxRef=useRef(0);
  const [pzOSolved,setPzOSolved]=useState(0);        // count of Lichess puzzles solved
  const dstr=(dt)=>dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  const DAILY_GOAL=5;
  const [daily,setDaily]=useState(()=>{try{return JSON.parse(localStorage.getItem('ct_daily')||'null')||{date:'',count:0,streak:0};}catch{return {date:'',count:0,streak:0};}});
  const dailyRef=useRef(daily); dailyRef.current=daily;
  const bumpDaily=()=>{const now=new Date();const t=dstr(now);const y=new Date(now);y.setDate(y.getDate()-1);const ys=dstr(y);const d=dailyRef.current||{date:'',count:0,streak:0};const nd=(d.date===t)?{...d,count:(d.count||0)+1}:{date:t,count:1,streak:(d.date===ys?((d.streak||0)+1):1)};setDaily(nd);try{localStorage.setItem('ct_daily',JSON.stringify(nd));}catch(e){}};
  const [coachHidden,setCoachHidden]=useState(()=>{try{return localStorage.getItem('ct_coach_dismiss')===dstr(new Date());}catch{return false;}});
  const [coachOpen,setCoachOpen]=useState(false);
  const [pzOLoading,setPzOLoading]=useState(false);
  const [pzOErr,setPzOErr]=useState('');
  const [pzOInfo,setPzOInfo]=useState('');
  const [pzIdInput,setPzIdInput]=useState('');
  const [pzPackUrl,setPzPackUrl]=useState('');
  const [pzPack,setPzPack]=useState(null);           // loaded pack rows
  const [pzPackIdx,setPzPackIdx]=useState(0);
  const [pzOSolvedIds,setPzOSolvedIds]=useState({}); // ids of solved online/pack puzzles (to skip)
  const [pzDiff,setPzDiff]=useState('any');          // pack difficulty filter: any|easy|med|hard
  const [pzCelebrate,setPzCelebrate]=useState(null); // tier object shown in the rank-up celebration
  const [promo,setPromo]=useState(null); // pending promotion: {g, choices:[mv...], tr, tc}

  const UI=useRef({sel:null,tgts:[],drag:null,dragging:false});
  const [,setTick]=useState(0);
  const repaint=()=>setTick(t=>t+1);
  const prevDemoRef=useRef(0);
  const animTimerRef=useRef(null);
  const copyTimerRef=useRef(null);

  const gameRef=useRef(game); gameRef.current=game;
  const flipRef=useRef(flip); flipRef.current=flip;
  const modeRef=useRef(mode); modeRef.current=mode;
  const opponentRef=useRef(opponent); opponentRef.current=opponent;
  const onlineGameRef=useRef(onlineGame); onlineGameRef.current=onlineGame;
  const myColorRef=useRef(myColor); myColorRef.current=myColor;
  const [preMv,setPreMv]=useState(null);            // armed premove {fr,fc,tr,tc} while waiting on the opponent
  const preMvRef=useRef(null); preMvRef.current=preMv;
  const showHintRef=useRef(showHint); showHintRef.current=showHint;
  const openIdxRef=useRef(openIdx); openIdxRef.current=openIdx;
  const openStepRef=useRef(openStep); openStepRef.current=openStep;
  const learnPhaseRef=useRef(learnPhase); learnPhaseRef.current=learnPhase;
  const trainArmed=useRef(false);
  const learnLineRef=useRef(learnLine); learnLineRef.current=learnLine;
  const puzIdxRef=useRef(puzIdx); puzIdxRef.current=puzIdx;
  const puzStepRef=useRef(puzStep); puzStepRef.current=puzStep;
  const puzSolvedRef=useRef(puzSolved); puzSolvedRef.current=puzSolved;
  const puzSideRef=useRef(puzSide); puzSideRef.current=puzSide;
  const pzSolvedRef=useRef(pzSolvedMap); pzSolvedRef.current=pzSolvedMap;
  const pzStreakRef=useRef(pzStreak); pzStreakRef.current=pzStreak;
  const pzBestRef=useRef(pzBest); pzBestRef.current=pzBest;
  const pzXPRef=useRef(pzXP); pzXPRef.current=pzXP;
  const pzTrainTierRef=useRef(pzTrainTier); pzTrainTierRef.current=pzTrainTier;
  const pzUnlockRef=useRef(pzUnlock); pzUnlockRef.current=pzUnlock;
  const curPuzRef=useRef(curPuz); curPuzRef.current=curPuz;
  myMistakesRef.current=myMistakes;
  const myBrilliantRef=useRef([]); myBrilliantRef.current=myBrilliant;
  const drillKindRef=useRef('mistake');
  useEffect(()=>{try{localStorage.setItem('ct_mymistakes',JSON.stringify(myMistakes));}catch{}},[myMistakes]);
  useEffect(()=>{try{localStorage.setItem('ct_mybrilliancies',JSON.stringify(myBrilliant));}catch{}},[myBrilliant]);
  // One-time reset (per Kunal): drop pre-#59 saved brilliancies so they rebuild with the stricter detector as games are reviewed.
  useEffect(()=>{try{if(!localStorage.getItem('ct_bril_reset_v1')){localStorage.setItem('ct_bril_reset_v1','1');setMyBrilliant([]);}}catch(e){}},[]);
  const pzOSolvedRef=useRef(pzOSolved); pzOSolvedRef.current=pzOSolved;
  const pzOSolvedIdsRef=useRef(pzOSolvedIds); pzOSolvedIdsRef.current=pzOSolvedIds;
  const pzDiffRef=useRef(pzDiff); pzDiffRef.current=pzDiff;
  // Load saved progress once on mount
  useEffect(()=>{(async()=>{try{const raw=await PZSTORE.get(PZKEY);if(raw){const o=JSON.parse(raw);if(o&&typeof o==='object'){setPzSolvedMap(o.solved||{});setPzStreak(o.streak||0);setPzBest(o.best||0);setPzXP(o.xp||0);setPzOSolved(o.online||0);setPzOSolvedIds(o.onlineIds||{});}}}catch(e){}try{const u=await PZSTORE.get(PZUKEY);if(u==='1')setPzUnlock(true);}catch(e){}})();},[]);
  // PIN box → unlock all tiers (or re-lock)
  const pzTryPin=()=>{const code=String(pzPin||'').trim();if(code.toLowerCase()===PZ_PIN.toLowerCase()){setPzUnlock(true);setPzPin('');setPzPinErr('');PZSTORE.set(PZUKEY,'1');}else{setPzPinErr('Wrong code.');setTimeout(()=>setPzPinErr(''),2000);}};
  const pzRelock=()=>{setPzUnlock(false);PZSTORE.set(PZUKEY,'0');};
  useEffect(()=>{if(pzCelebrate){const t=setTimeout(()=>setPzCelebrate(null),5000);return()=>clearTimeout(t);}},[pzCelebrate]);
  const boardRef=useRef(null);
  const rootRef=useRef(null);

  const inReview=mode==='analyze'&&review!==null;
  const inDemo=mode==='learn'&&learnPhase==='demo'&&learnLine.length>0;
  const demoSt=useMemo(()=>inDemo?demoState(learnLine,demoPly,learnFEN):null,[inDemo,learnLine,demoPly,learnFEN]);
  const lpHist=useMemo(()=>{
    if(mode!=='learn'||learnPhase!=='practice'||openIdx==null)return [];
    const op=LIB[openIdx]; if(!op)return [];
    let g=op.fen?fromFEN(op.fen):initGame(); const out=[g];
    const lim=Math.min(openStep,learnLine.length);
    for(let i=0;i<lim;i++){const mv=findMoveBySAN(g,learnLine[i]); if(!mv)break; g=makeMove(g,mv); out.push(g);}
    return out;
  },[mode,learnPhase,openIdx,openStep,learnLine]);
  const _lpLive=(mode==='learn'&&learnPhase==='practice'&&lpv!=null&&lpHist.length>0&&lpv<lpHist.length);
  const _pvLive=(mode==='play'&&!inReview&&!inDemo&&pvIdx!=null&&pvIdx<playHist.length);
  const boardGame=inReview?review.positions[ply]:(inDemo?demoSt.game:(_pvLive?playHist[pvIdx]:(_lpLive?lpHist[lpv]:game)));
  const boardLast=inReview?(ply>0?review.plies[ply-1].move:null):(inDemo?demoSt.last:((_pvLive||_lpLive)?((boardGame.history&&boardGame.history.length)?boardGame.history[boardGame.history.length-1].move:null):lastMv));
  // Arrows shown on the board during the demo: the move just played (amber) + any idea arrows (blue)
  const boardArrows=useMemo(()=>{
    if(!inDemo)return [];
    const out=[];
    if(boardLast)out.push({from:[boardLast.fr,boardLast.fc],to:[boardLast.tr,boardLast.tc],color:'#f0b429'});
    const extra=learnArrows&&learnArrows[demoPly];
    if(extra)for(const a of extra)out.push({from:sq2rc(a[0]),to:sq2rc(a[1]),color:a[2]||'var(--ac)'});
    return out;
  },[inDemo,boardLast,learnArrows,demoPly]);
  const curNote=inDemo&&demoPly>0?(learnNotes[demoPly-1]||''):'';

  const status=useMemo(()=>getStatus(boardGame),[boardGame]);
  const isOver=status==='checkmate'||status==='stalemate';
  const chkSq=useMemo(()=>{
    const st=getStatus(boardGame);
    if(st!=='check'&&st!=='checkmate')return null;
    const k=findKing(boardGame.board,boardGame.turn);return k?rc2sq(k[0],k[1]):null;
  },[boardGame]);

  const RAIL=Math.max(190,Math.min(320,Math.round(vp.w*0.255)));   // comfortable side-rail width, scales with screen
  const wide=vp.w>vp.h&&(vp.w-RAIL-48)>=360;                       // one sidebar + board; board fills the rest
  const SQ=useMemo(()=>{if(wide){const availH=vp.h-24;const minRail=Math.max(196,Math.round(vp.w*0.20));const wcap=vp.w-minRail-20;const bp=Math.floor(Math.min(availH,wcap,1000)/8)*8;return Math.max(24,bp/8);}const reserved=4+((inReview||(mode==='play'&&opponent==='computer'))?0:0);const widthCap=vw-reserved;const wh=vp.h;const heightCap=mode==='play'?(wh-262):(wh*0.66-16);const hardCap=mode==='play'?900:820;const bp=Math.floor(Math.min(widthCap,heightCap,hardCap)/8)*8;return Math.max(24,bp/8);},[vw,vp,mode,wide,RAIL,inReview,opponent]);
  const boardPx=SQ*8;
  const sideW=wide?Math.max(200,Math.min(vp.w-boardPx-20,520)):RAIL;
  // outerRowStyle / sideColStyle are defined after showBoard (they need railed = wide && showBoard)
  const analyzeLine=()=>{const h=boardGame.history;if(!h||!h.length)return;let s='';for(let i=0;i<h.length;i++){if(i%2===0)s+=(i/2+1)+'. ';s+=h[i].san+' ';}s=s.trim();setOpenIdx(null);setMenuOpen(false);setHomeScreen(false);setMode('analyze');importGame(s);};
  const copyMoves=()=>{const h=boardGame.history;if(!h||!h.length)return;let s='';for(let i=0;i<h.length;i++){if(i%2===0)s+=(i/2+1)+'. ';s+=h[i].san+' ';}s=s.trim();const flash=(m)=>{setCopyMsg(m);if(copyTimerRef.current)clearTimeout(copyTimerRef.current);copyTimerRef.current=setTimeout(()=>setCopyMsg(''),1800);};const viaExec=()=>{try{const ta=document.createElement('textarea');ta.value=s;ta.style.position='fixed';ta.style.top='0';ta.style.left='0';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();try{ta.setSelectionRange(0,s.length);}catch(e){}const ok=document.execCommand('copy');document.body.removeChild(ta);flash(ok?'✓ Copied!':'⚠ Long-press list');}catch(e){flash('⚠ Long-press list');}};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(()=>flash('✓ Copied!')).catch(viaExec);}else viaExec();};
  useEffect(()=>{
    const measure=()=>{const w=Math.min(window.innerWidth||9999,(document.documentElement&&document.documentElement.clientWidth)||9999,(rootRef.current&&rootRef.current.clientWidth)||9999);if(w&&w>0&&w<9999)setVw(w);setVp({w:window.innerWidth||360,h:window.innerHeight||800});};
    measure();const t1=setTimeout(measure,120);const t2=setTimeout(measure,400);
    window.addEventListener('resize',measure);window.addEventListener('orientationchange',measure);
    let ro;if(window.ResizeObserver&&rootRef.current){ro=new ResizeObserver(measure);ro.observe(rootRef.current);}
    return()=>{clearTimeout(t1);clearTimeout(t2);window.removeEventListener('resize',measure);window.removeEventListener('orientationchange',measure);if(ro)ro.disconnect();};
  },[]);

  // While a piece is actually being dragged, swallow touchmove so the page (or the
  // Claude chat behind an embedded frame) can't scroll mid-drag. Only active when a
  // piece is grabbed, so normal scrolling everywhere else is untouched.
  useEffect(()=>{
    const block=(e)=>{const ui=UI.current;if(ui&&ui.drag){try{e.preventDefault();}catch(_){}}};
    window.addEventListener('touchmove',block,{passive:false});
    document.addEventListener('touchmove',block,{passive:false});
    return()=>{window.removeEventListener('touchmove',block,{passive:false});document.removeEventListener('touchmove',block,{passive:false});};
  },[]);

  const fullReset=(g=initGame())=>{setGame(g);setLastMv(null);setPlayHist([]);setPlayHintMv(null);setPlayEnd(null);playEndRef.current=null;setPreMv(null);eloDoneRef.current=false;setEloMsg('');const tc=timeCtrlRef.current;const live=!!tc&&tc.kind!=='corr';setClock({w:live?tc.init*1000:0,b:live?tc.init*1000:0,run:false});UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();};

  useEffect(()=>{timeCtrlRef.current=timeCtrl;},[timeCtrl]);
  useEffect(()=>{pvIdxRef.current=pvIdx;},[pvIdx]);
  useEffect(()=>{setPvIdx(null);},[playHist.length]);
  useEffect(()=>{lpvRef.current=lpv;},[lpv]);
  useEffect(()=>{setLpv(null);},[openStep,learnPhase,openIdx]);
  useEffect(()=>{playEndRef.current=playEnd;},[playEnd]);

  useEffect(()=>{if(cyclingRef.current)return;try{localStorage.setItem('ct_theme',theme);}catch{}},[theme]);
  useEffect(()=>{try{localStorage.setItem('ct_skin',skin);}catch{}},[skin]);
  useEffect(()=>{try{localStorage.setItem('ct_elo',cpuElo);}catch{}},[cpuElo]);
  useEffect(()=>{SFX_ON=soundOn;try{localStorage.setItem('ct_sound',soundOn?'1':'0');}catch{}},[soundOn]);
  useEffect(()=>{try{if(selBot)localStorage.setItem('ct_bot',selBot);else localStorage.removeItem('ct_bot');}catch{}},[selBot]);
  useEffect(()=>{try{localStorage.setItem('ct_coachstyle',coachStyle);}catch{}},[coachStyle]);
  useEffect(()=>{try{localStorage.setItem('ct_traintap',trainTap?'1':'0');}catch{}},[trainTap]);
  useEffect(()=>{try{localStorage.setItem('ct_train',JSON.stringify(trainMastery));}catch{}},[trainMastery]);
  useEffect(()=>{try{localStorage.setItem('ct_learnprog',JSON.stringify(learnProg));}catch{}},[learnProg]);
  useEffect(()=>{try{localStorage.setItem('ct_coachtargets',JSON.stringify(coachTargets));}catch{}},[coachTargets]);
  useEffect(()=>{try{localStorage.setItem('ct_coachtier',JSON.stringify(coachTier));}catch{}},[coachTier]);
  useEffect(()=>{if(!coachOpen)return;setCoachTier(t=>{const at=(typeof t.swapAt==='number')?t.swapAt:0;if(Date.now()-at>=432000000&&(t.swapsLeft||0)<2)return {...t,swapsLeft:2,swapAt:Date.now()};if(typeof t.swapAt!=='number')return {...t,swapAt:Date.now()};return t;});},[coachOpen]);
  useEffect(()=>{if(mode==='learn'&&learnPhase==='practice'&&(showHint||revealHint)){learnRepRef.current.hints=true;const _op=LIB[openIdxRef.current];const nm=_op&&_op.name;if(nm){hintLockRef.current={...hintLockRef.current,[nm]:Date.now()+600000};try{localStorage.setItem('ct_hintlock',JSON.stringify(hintLockRef.current));}catch(e){}}}},[mode,learnPhase,showHint,revealHint]);
  useEffect(()=>{
    if(mode==='learn'&&learnPhase==='practice'&&openIdx!=null&&learnLine.length>0){
      if(openStep<learnLine.length){trainArmed.current=true;}
      else if(trainArmed.current){trainArmed.current=false;const key=LIB[openIdx]&&LIB[openIdx].name;if(key)setTrainMastery(prev=>{const cur=prev[key]||{reps:0};const reps=(cur.reps||0)+1;const days=[1,3,7,16,30][Math.min(reps-1,4)];return {...prev,[key]:{learned:true,reps,last:Date.now(),due:Date.now()+days*86400000}};});}
    }else{trainArmed.current=false;}
  },[mode,learnPhase,openStep,learnLine,openIdx]);
  useEffect(()=>{try{localStorage.setItem('ct_depth',boardDepth?'1':'0');}catch{}},[boardDepth]);
  useEffect(()=>{try{localStorage.setItem('ct_hideEval',hideEval?'1':'0');}catch{}},[hideEval]);
  useEffect(()=>{try{localStorage.setItem('ct_pro',testPro?'1':'0');}catch{}},[testPro]);
  useEffect(()=>{const C=(typeof window!=='undefined')?window.CTCloud:null;if(!C||!C.proWatch||!cloudUser){setSubPro(false);return;}let unsub=null;try{unsub=C.proWatch(a=>setSubPro(!!a));}catch(e){setSubPro(false);}return()=>{try{unsub&&unsub();}catch(e){}};},[cloudUser]);
  useEffect(()=>{const C=(typeof window!=='undefined')?window.CTCloud:null;if(!C||!C.friendsWatch||!cloudUser){setFriendsData({incoming:[],friends:[]});return;}let unsub=null;try{unsub=C.friendsWatch(d=>setFriendsData(d||{incoming:[],friends:[]}));}catch(e){}return()=>{try{unsub&&unsub();}catch(e){}};},[cloudUser]);
  useEffect(()=>{const C=(typeof window!=='undefined')?window.CTCloud:null;if(!C||!C.nearbyList||!cloudUser||!nearbyGeo){return;}let unsub=null;try{unsub=C.nearbyList(nearbyGeo,list=>{const me=cloudUser&&cloudUser.uid;const cutoff=Date.now()-14*24*3600*1000;setNearbyData((list||[]).filter(x=>x&&x.uid!==me&&(!x.at||x.at>cutoff)));});}catch(e){}return()=>{try{unsub&&unsub();}catch(e){}};},[cloudUser,nearbyGeo]);
  useEffect(()=>{try{localStorage.setItem('ct_ccuser',chessUser);}catch{}},[chessUser]);
  useEffect(()=>{try{localStorage.setItem('ct_liuser',lichessUser);}catch{}},[lichessUser]);
  useEffect(()=>{syncRef.current={theme,elo:cpuElo,skin};},[theme,cpuElo,skin]);
  // ── Cloud sync (deployed app only; bridge absent in the artifact preview) ──
  useEffect(()=>{
    const C=(typeof window!=='undefined')?window.CTCloud:null;
    if(!C)return; setCloudAvail(true);
    C.onAuth(async(u)=>{
      setCloudUser(u);
      if(!u)return;
      try{
        const data=await C.load();
        if(data){
          if(typeof data.theme==='number'&&data.theme>=0&&data.theme<THEMES.length)setTheme(data.theme);if(typeof data.skin==='number'&&data.skin>=0&&data.skin<SKINS.length)setSkin(data.skin);
          if(typeof data.elo==='number')setCpuElo(Math.max(ELO_MIN,Math.min(ELO_MAX,data.elo)));
          if(data.hintprefs&&typeof data.hintprefs==='object'){hintPrefsRef.current={...data.hintprefs};try{localStorage.setItem('ct_hintprefs',JSON.stringify(hintPrefsRef.current));}catch{}}
          if(data.learnprog&&typeof data.learnprog==='object'){const lp=data.learnprog;setLearnProg(loc=>{const out={...loc};for(const k in lp){const a=out[k]||{},b=lp[k]||{};const days=[...new Set([...(a.days||[]),...(b.days||[])])].sort();out[k]={learned:days.length>=1,days};}return out;});}
          if(Array.isArray(data.coachtargets)&&data.coachtargets.length&&!(coachTargetsRef.current||[]).length)setCoachTargets(data.coachtargets.filter(x=>typeof x==='string'));
          if(data.coachtier&&typeof data.coachtier.cleared==='number'&&data.coachtier.cleared>(coachTierRef.current.cleared||0))setCoachTier({cleared:data.coachtier.cleared,swapsLeft:(typeof data.coachtier.swapsLeft==='number'?data.coachtier.swapsLeft:2),swapAt:(typeof data.coachtier.swapAt==='number'?data.coachtier.swapAt:Date.now())});
          if(data.pz&&typeof data.pz==='object'){const cp=data.pz;
            if(cp.solved&&typeof cp.solved==='object')setPzSolvedMap(m=>({...m,...cp.solved}));
            if(cp.onlineIds&&typeof cp.onlineIds==='object')setPzOSolvedIds(m=>({...m,...cp.onlineIds}));
            if(typeof cp.best==='number')setPzBest(b=>Math.max(b,cp.best));
            if(typeof cp.xp==='number')setPzXP(x=>Math.max(x,cp.xp));
            if(typeof cp.online==='number')setPzOSolved(o=>Math.max(o,cp.online));
          }
        }else{
          C.save({theme:syncRef.current.theme,skin:syncRef.current.skin,elo:syncRef.current.elo,hintprefs:readHintPrefs(),pz:{solved:pzSolvedRef.current,streak:pzStreakRef.current,best:pzBestRef.current,xp:pzXPRef.current,online:pzOSolvedRef.current,onlineIds:pzOSolvedIdsRef.current},learnprog:learnProgRef.current,coachtargets:coachTargetsRef.current,coachtier:coachTierRef.current});
        }
      }catch(e){}
    });
  },[]);
  useEffect(()=>{
    const C=(typeof window!=='undefined')?window.CTCloud:null;
    if(!C||!cloudUser)return;
    const t=setTimeout(()=>{try{C.save({theme,skin,elo:cpuElo,hintprefs:readHintPrefs()});}catch(e){}},800);
    return ()=>clearTimeout(t);
  },[theme,cpuElo,skin,cloudUser]);
  // Mirror puzzle progress to local store (covers cloud-merged data) + push to cloud
  useEffect(()=>{
    const o={solved:pzSolvedMap,streak:pzStreak,best:pzBest,xp:pzXP,online:pzOSolved,onlineIds:pzOSolvedIds};
    const t1=setTimeout(()=>{try{PZSTORE.set(PZKEY,JSON.stringify(o));}catch(e){}},400);
    const C=(typeof window!=='undefined')?window.CTCloud:null;
    let t2=null; if(C&&C.user){t2=setTimeout(()=>{try{C.save({pz:o});}catch(e){}},1000);}
    return ()=>{clearTimeout(t1);if(t2)clearTimeout(t2);};
  },[pzSolvedMap,pzStreak,pzBest,pzXP,pzOSolved,pzOSolvedIds,cloudUser]);
  useEffect(()=>{const C=(typeof window!=='undefined')?window.CTCloud:null;if(!C||!cloudUser)return;const t=setTimeout(()=>{try{C.save({learnprog:learnProgRef.current});}catch(e){}},900);return ()=>clearTimeout(t);},[learnProg,cloudUser]);
  useEffect(()=>{const C=(typeof window!=='undefined')?window.CTCloud:null;if(!C||!cloudUser)return;const t=setTimeout(()=>{try{C.save({coachtargets:coachTargetsRef.current,coachtier:coachTierRef.current});}catch(e){}},900);return ()=>clearTimeout(t);},[coachTargets,coachTier,cloudUser]);
  const cloudSignIn=()=>{const C=(typeof window!=='undefined')?window.CTCloud:null;if(!C)return;setCloudErr('');C.signIn().catch(e=>{const code=e&&e.code;setCloudErr(code==='auth/unauthorized-domain'?'This site isn’t authorized in Firebase yet — add the domain in Auth settings.':(code==='auth/popup-blocked'?'Popup blocked — allow popups and retry.':'Sign-in failed, please retry.'));});};
  const cloudSignOut=()=>{const C=(typeof window!=='undefined')?window.CTCloud:null;if(C)C.signOut();setCloudUser(null);};
  useEffect(()=>{
    try{
      const w=new Worker('./stockfish-18-lite-single.js');
      w.onmessage=(e)=>{
        const msg=String(e.data||'');
        if(msg==='readyok'){sfReadyRef.current=true;setSfReady(true);}
        // During a full-strength eval search, read the score and convert to White's POV.
        if(sfEvalingRef.current&&msg.startsWith('info')&&msg.indexOf(' score ')!==-1){
          const fen=sfEvalFenRef.current; const stm=(fen.split(' ')[1]||'w'); const sign=(stm==='w')?1:-1;
          const mm=msg.match(/score mate (-?\d+)/); const cm=msg.match(/score cp (-?\d+)/);
          if(mm){setSfEval({mate:sign*parseInt(mm[1],10),cp:null,fen});}
          else if(cm){setSfEval({mate:null,cp:sign*parseInt(cm[1],10),fen});}
        }
        if(!sfEvalingRef.current&&sfCandRef.current&&msg.startsWith('info')&&msg.indexOf(' multipv ')!==-1&&msg.indexOf(' pv ')!==-1&&msg.indexOf(' score ')!==-1){
          const _pn=msg.match(/ multipv (\d+)/),_pv=msg.match(/ pv (\S+)/),_cm=msg.match(/score cp (-?\d+)/),_mm=msg.match(/score mate (-?\d+)/);
          if(_pv&&_pv[1]){sfCandRef.current[_pn?parseInt(_pn[1],10):1]={uci:_pv[1],cp:_cm?parseInt(_cm[1],10):null,mate:_mm?parseInt(_mm[1],10):null};}
        }
        if(msg.startsWith('bestmove')){
          if(sfEvalingRef.current)sfEvalingRef.current=false;
          const bm=msg.split(' ')[1];
          const cb=sfCbRef.current; sfCbRef.current=null;
          if(cb)cb(bm&&bm!=='(none)'?bm:null);
        }
      };
      w.onerror=()=>{sfRef.current=null;};
      w.postMessage('uci'); w.postMessage('isready');
      sfRef.current=w;
    }catch(e){/* no Stockfish — built-in engine fallback */}
    return()=>{try{sfRef.current?.terminate();}catch(e){}};
  },[]);
  useEffect(()=>()=>{try{sfAnaRef.current?.terminate();}catch(e){}},[]);

  // AI auto-move (Play) — uses Stockfish WASM if available, falls back to built-in engine
  useEffect(()=>{
    if(mode!=='play'||opponent!=='computer'||playEnd||getStatus(game)==='checkmate'||getStatus(game)==='stalemate')return;
    if(game.turn===pColor)return;
    setThinking(true);
    const mover=game.turn;
    const applyMv=(mv)=>{
      if(playEndRef.current){setThinking(false);return;}
      if(mv){setPlayHist(h=>[...h,game]);setGame(g=>makeMove(g,mv));setLastMv(mv);sfxMove(game,mv);const tc=timeCtrlRef.current;if(tc)setClock(c=>({...c,run:true,[mover]:c[mover]+tc.inc*1000}));}
      setThinking(false);
      if(mv&&preMvRef.current){const ng=makeMove(game,mv);const pm=preMvRef.current;const st2=getStatus(ng);
        if(st2==='checkmate'||st2==='stalemate'||playEndRef.current){setPreMv(null);}
        else if(ng.turn===pColor){setPreMv(null);const pmv=getLegal(ng).find(x=>x.fr===pm.fr&&x.fc===pm.fc&&x.tr===pm.tr&&x.tc===pm.tc&&(!x.promo||x.promo==='q'));if(pmv)setTimeout(()=>{doMove(ng,pmv);},40);}
      }
    };
    if(sfRef.current&&sfReadyRef.current&&cpuElo>=1320){
      // Strong, accurately-calibrated play: use Stockfish's own Elo limiter (its UCI_Elo floor is ~1320).
      const e=Math.min(2850,cpuElo);
      let cancelled=false;
      sfEvalingRef.current=false; // this is a move search, not an eval search — don't let its info feed the eval bar
      const _style=(selBot&&botById(selBot)&&botById(selBot).style)||'balanced';
      sfCandRef.current=(_style==='balanced')?null:{};   // only a personality bot collects candidate lines
      sfCbRef.current=(uci)=>{if(cancelled)return;let mv=null;
        try{
          const cand=sfCandRef.current; sfCandRef.current=null;
          if(_style!=='balanced'&&uci&&cand){
            const sc=(c)=>c?(c.mate!=null?(c.mate>0?100000-c.mate*100:-100000-c.mate*100):(c.cp!=null?c.cp:null)):null;
            const list=Object.keys(cand).map(k=>cand[k]).filter(c=>c&&c.uci&&sc(c)!=null);
            const chosen=list.find(c=>c.uci===uci),cs=chosen?sc(chosen):null;
            if(cs!=null){const near=list.filter(c=>Math.abs(sc(c)-cs)<=25);
              if(near.length>=2){let bp=null,bb=-1e9;for(const c of near){const m=uciToMove(game,c.uci);if(!m)continue;const sb=styleBias(game,m,_style);if(sb>bb){bb=sb;bp=m;}}if(bp)mv=bp;}}
          }
        }catch(e){mv=null;}
        if(!mv)mv=(uci&&uciToMove(game,uci))||bestMove(game,1,0);
        applyMv(mv);
      };
      sfRef.current.postMessage('setoption name UCI_LimitStrength value true');
      sfRef.current.postMessage('setoption name UCI_Elo value '+e);
      sfRef.current.postMessage('setoption name MultiPV value '+(_style==='balanced'?1:3));
      sfRef.current.postMessage('position fen '+toFEN(game));
      sfRef.current.postMessage('go movetime '+(cpuElo<1500?1100:cpuElo<2000?1900:2600));
      return()=>{cancelled=true;sfCbRef.current=null;try{sfRef.current?.postMessage('stop');}catch(e){}};
    }else{
      // Beginner / club range (≤1300): the built-in engine is tuned to play gently and blunder. Stockfish can't play this weakly (even Skill Level 0 is ~1300+ Elo), so we use the homemade engine here for fair, beatable games.
      const {d:depth,r:rnd}=eloParams(cpuElo); QDEPTH=2;
      const bs=(selBot&&botById(selBot)&&botById(selBot).style)||'balanced';
      const id=setTimeout(()=>applyMv(bestMove(game,depth,rnd,bs)),300);
      return()=>clearTimeout(id);
    }
  },[game,mode,opponent,pColor,cpuElo,playEnd]);

  // Clock tick — decrement the side to move once the clock is running
  useEffect(()=>{
    if(mode!=='play'||!timeCtrl||timeCtrl.kind==='corr'||!clock.run||playEnd)return;
    if(getStatus(game)==='checkmate'||getStatus(game)==='stalemate')return;
    const side=game.turn;
    const iv=setInterval(()=>{setClock(c=>{if(!c.run)return c;const t=Math.max(0,c[side]-100);const nc={...c,[side]:t};if(t<=0)nc.run=false;return nc;});},100);
    return()=>clearInterval(iv);
  },[mode,timeCtrl,clock.run,game.turn,playEnd,game]);

  // Flag on time
  useEffect(()=>{
    if(mode!=='play'||!timeCtrl||timeCtrl.kind==='corr'||playEnd)return;
    if(getStatus(game)==='checkmate'||getStatus(game)==='stalemate')return;
    if(clock.w<=0&&(clock.w||clock.b))setPlayEnd({reason:'time',winner:'b'});
    else if(clock.b<=0&&(clock.w||clock.b))setPlayEnd({reason:'time',winner:'w'});
  },[clock.w,clock.b,mode,timeCtrl,playEnd,game]);

  // Adaptive Elo — adjust once when a vs-Computer game ends
  useEffect(()=>{
    if(mode!=='play'||opponent!=='computer')return;
    const st=getStatus(game);let winner=null,draw=false;
    if(playEnd){if(playEnd.reason==='draw')draw=true;else winner=playEnd.winner;}
    else if(st==='checkmate')winner=opp(game.turn);
    else if(st==='stalemate')draw=true;
    else return;
    if(eloDoneRef.current)return;eloDoneRef.current=true;
    if(draw){setEloMsg('Draw — strength stays ~'+cpuElo+' Elo');return;}
    const ne=Math.max(ELO_MIN,Math.min(ELO_MAX,cpuElo+(winner===pColor?50:-50)));
    if(ne!==cpuElo){setCpuElo(ne);setEloMsg((winner===pColor?'▲ ':'▼ ')+'Strength now ~'+ne+' Elo');}
  },[game,playEnd,mode,opponent,pColor,cpuElo]);

  useEffect(()=>{if(mode==='play'&&opponent==='computer')setFlip(pColor==='b');},[pColor,opponent,mode]);
  useEffect(()=>{if(mode==='play'&&opponent==='human'&&!playEnd)setFlip(game.turn==='b');},[game.turn,opponent,mode,playEnd]);
  // Online: rebuild the board from the authoritative synced move list whenever it changes
  useEffect(()=>{
    if(opponent!=='online'||!onlineGame)return;
    const moves=onlineGame.moves||[];
    let g=initGame(),last=null;const hist=[];
    for(const san of moves){const mv=findMoveBySAN(g,san);if(!mv)break;hist.push(g);last=mv;g=makeMove(g,mv);}
    setGame(g);setLastMv(last);setPlayHist(hist);{const _ls=moves.length?moves[moves.length-1]:'';if(_ls&&_ls!==_sfxLastRef.current)sfxMove(hist.length?hist[hist.length-1]:null,last);_sfxLastRef.current=_ls;}
    UI.current={sel:null,tgts:[],drag:null,dragging:false};
    const pm=preMvRef.current;
    if(pm){
      if(onlineGame.result||onlineGame.status!=='active'){setPreMv(null);}
      else if(myColor&&g.turn===myColor){
        setPreMv(null);
        const pmv=getLegal(g).find(x=>x.fr===pm.fr&&x.fc===pm.fc&&x.tr===pm.tr&&x.tc===pm.tc&&(!x.promo||x.promo==='q'));
        if(pmv)setTimeout(()=>{doMove(g,pmv);},40);
      }
    }
  },[opponent,myColor,(onlineGame&&onlineGame.moves)?onlineGame.moves.length:0,onlineGame&&onlineGame.status,onlineGame&&onlineGame.result]);
  useEffect(()=>{if(opponent==='online'&&myColor)setFlip(myColor==='b');},[opponent,myColor,onlineGame&&onlineGame.status]);

  // Auto-play the demo walkthrough (gentle pace so the glide can register)
  useEffect(()=>{
    if(mode!=='learn'||learnPhase!=='demo'||!demoPlaying)return;
    if(demoPly>=learnLine.length){setDemoPlaying(false);return;}
    const id=setTimeout(()=>setDemoPly(p=>Math.min(learnLine.length,p+1)),1500);
    return()=>clearTimeout(id);
  },[mode,learnPhase,demoPlaying,demoPly,learnLine]);

  // Glide the moving piece across the board on a forward demo step
  useEffect(()=>{
    const prev=prevDemoRef.current; prevDemoRef.current=demoPly;
    if(animTimerRef.current){clearTimeout(animTimerRef.current);animTimerRef.current=null;}
    if(!inDemo||demoPly!==prev+1||demoPly<1){setAnim(null);return;}
    const ds=demoState(learnLine,demoPly,learnFEN);const mv=ds.last;
    if(!mv){setAnim(null);return;}
    const pc=ds.game.board[mv.tr][mv.tc];
    if(!pc){setAnim(null);return;}
    setAnim({piece:pc,from:[mv.fr,mv.fc],to:[mv.tr,mv.tc]});setAnimTo(false);
    const r1=requestAnimationFrame(()=>{const r2=requestAnimationFrame(()=>setAnimTo(true));animTimerRef.current=r2;});
    const t=setTimeout(()=>{setAnim(null);animTimerRef.current=null;},520);
    return()=>{cancelAnimationFrame(r1);clearTimeout(t);};
  },[inDemo,demoPly,learnLine]);

  // Keyboard nav in review
  useEffect(()=>{
    if(!inReview)return;
    const h=(e)=>{if(e.key==='ArrowLeft'){setPly(p=>Math.max(0,p-1));}else if(e.key==='ArrowRight'){setPly(p=>Math.min(review.plies.length,p+1));}};
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[inReview,review]);

  const readHintPrefs=()=>{if(hintPrefsRef.current===null){try{hintPrefsRef.current=JSON.parse(localStorage.getItem('ct_hintprefs')||'{}');}catch{hintPrefsRef.current={};}}return hintPrefsRef.current;};
  const setHintFor=(key,val)=>{const p=readHintPrefs();if(key)p[key]=val;try{localStorage.setItem('ct_hintprefs',JSON.stringify(p));}catch{}const C=(typeof window!=='undefined')?window.CTCloud:null;if(C&&C.user){try{C.save({hintprefs:p});}catch(e){}}};
  // ── Learn: load opening ──
  const selectOpening=(idx)=>{
    const op=LIB[idx];
    if(op&&op.fen){let _ok=true;try{const _g=fromFEN(op.fen);if(isInCheck(_g.board,opp(_g.turn)))_ok=false;}catch(e){_ok=false;}if(!_ok){setOnlineInfo('That position needs a fix and is unavailable right now.');return;}}
    setOpenIdx(idx);setLastLesson(idx);try{localStorage.setItem('ct_lastlesson',String(idx));}catch{}setLearnCat(op.cat);setLearnPhase('demo');setLearnLine(op.line);setLearnLabel(op.name);setOpenMsg('');setOpenStep(0);const _hp=readHintPrefs();setShowHint(_hp[op.name]!==undefined?_hp[op.name]:true);setRevealHint(false);
    setDemoPly(0);setDemoPlaying(true);
    setLearnNotes(op.notes||[]);setLearnPlans(op.plans||'');setLearnIdea(op.idea||'');setLearnArrows(op.arrows||null);setLearnVideo(op.video||null);setShowVideo(false);setVideoOpen(false);
    setLearnFEN(op.fen||null);
    setFlip(op.side==='b');setGame(op.fen?fromFEN(op.fen):initGame());setLastMv(null);setInfoOpen(false);setIntroCard(true);
    UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();
  };
  const startPractice=(line,label)=>{
    learnRepRef.current={hints:!!showHintRef.current,miss:false};
    {const _op0=LIB[openIdxRef.current];let _k=_op0?_op0.name:(label||'');
     if(_op0&&Array.isArray(line)){const lj=line.join('|');if(_op0.line&&_op0.line.join('|')===lj)_k=_op0.name;else{const _vv=(_op0.vars||[]).find(v=>v.line&&v.line.join('|')===lj);if(_vv)_k=_op0.name+'§'+_vv.name;}}
     learnKeyRef.current=_k;}
    setLearnPhase('practice');setDemoPlaying(false);setLearnLine(line);setLearnLabel(label);setOpenMsg('');setInfoOpen(false);
    const op=LIB[openIdxRef.current];let g=op&&op.fen?fromFEN(op.fen):initGame();
    if(op&&!op.fen&&op.side==='b'){const mv=findMoveBySAN(g,line[0]);if(mv){g=makeMove(g,mv);setLastMv(mv);setOpenStep(1);}else setOpenStep(0);}
    else{setLastMv(null);setOpenStep(0);}
    setGame(g);UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();
  };
  const pickVariation=(v)=>{const op=LIB[openIdxRef.current];const _tl=op.line||[];let _cp=0;while(_cp<v.line.length&&_cp<_tl.length&&v.line[_cp]===_tl[_cp])_cp++;setLearnPhase('demo');setDemoPly(_cp);setDemoPlaying(true);setLearnLine(v.line);setLearnLabel(op.name+' → '+v.name);setOpenMsg('');setOpenStep(0);setLearnNotes(v.notes||[]);setLearnPlans(v.plans||op.plans||'');setLearnIdea(v.idea||op.idea||'');setLearnArrows(v.arrows||null);setLearnVideo(op.video||null);setShowVideo(false);setVideoOpen(false);setFlip(op.side==='b');setGame(initGame());setLastMv(null);setInfoOpen(false);UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();};

  // ── Puzzles ──
  const loadPuzzle=(idx)=>{
    const n=PZ.length;const i=((idx%n)+n)%n;const p=PZ[i];const g=fromFEN(p.fen);
    setPuzIdx(i);setCurPuz(p);setPuzStep(0);setPuzMsg('');setPuzSolved(false);setPuzReveal(false);setPuzSide(g.turn);
    setGame(g);setLastMv(null);setFlip(g.turn==='b');UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();
  };

  // ── Import + analyze ──
  // Dedicated analysis worker, created lazily on first review and kept warm. Resolves true once Stockfish is ready, false if Workers aren't available (sandbox/preview).
  const ensureAna=()=>new Promise(resolve=>{
    if(sfAnaRef.current&&sfAnaReadyRef.current){resolve(true);return;}
    if(!sfAnaRef.current){
      try{
        const w=new Worker('./stockfish-18-lite-single.js');
        w.onmessage=(e)=>{const msg=String(e.data||'');if(msg==='readyok'){sfAnaReadyRef.current=true;return;}const cb=sfAnaCbRef.current;if(!cb)return;if(msg.startsWith('info')&&msg.indexOf(' score ')!==-1){const pvm=msg.match(/ multipv (\d+)/);const mpv=pvm?parseInt(pvm[1],10):1;const mm=msg.match(/score mate (-?\d+)/),cm=msg.match(/score cp (-?\d+)/);if(mm)cb.score({mate:parseInt(mm[1],10),cp:null,mpv:mpv});else if(cm)cb.score({mate:null,cp:parseInt(cm[1],10),mpv:mpv});}else if(msg.startsWith('bestmove')){cb.best(msg.split(' ')[1]);}};
        w.onerror=()=>{sfAnaRef.current=null;sfAnaReadyRef.current=false;};
        w.postMessage('uci');w.postMessage('setoption name MultiPV value 2');w.postMessage('isready');
        sfAnaRef.current=w;
      }catch(e){resolve(false);return;}
    }
    let t=0;const iv=setInterval(()=>{if(sfAnaReadyRef.current||t++>50){clearInterval(iv);resolve(!!sfAnaReadyRef.current);}},100);
  });
  // Evaluate one position on the dedicated worker (full strength). White-POV cp; mate as a large ±cp via the caller. Resolves {cp,mate,bestmove} or null.
  const sfEval1=(fen,movetime)=>new Promise(resolve=>{
    const w=sfAnaRef.current;
    if(!w||!sfAnaReadyRef.current){resolve(null);return;}
    const stm=(fen.split(' ')[1]||'w'),sign=stm==='w'?1:-1;
    let cp=null,mate=null,cp2=null,mate2=null,done=false;
    const finish=(bm)=>{if(done)return;done=true;sfAnaCbRef.current=null;clearTimeout(to);resolve({cp,mate,cp2,mate2,bestmove:bm&&bm!=='(none)'?bm:null});};
    const to=setTimeout(()=>finish(null),Math.max(4000,movetime*8));
    sfAnaCbRef.current={score:(s)=>{const _m=s.mpv||1;if(_m===1){if(s.mate!=null){mate=sign*s.mate;cp=null;}else{cp=sign*s.cp;mate=null;}}else if(_m===2){if(s.mate!=null){mate2=sign*s.mate;cp2=null;}else{cp2=sign*s.cp;mate2=null;}}},best:(bm)=>finish(bm)};
    try{w.postMessage('setoption name UCI_LimitStrength value false');w.postMessage('position fen '+fen);w.postMessage('go movetime '+movetime);}catch(e){finish(null);}
  });
  const importGame=async(pgnArg,meta)=>{
    const text=(typeof pgnArg==='string')?pgnArg:pgnText;
    setPgnErr('');
    const sans=parsePGN(text);
    if(sans.length===0){setPgnErr('No moves found — paste a PGN or a list of moves like "1. e4 e5 2. Nf3".');return;}
    const res=loadSANs(sans);
    if(res.plies.length===0){setPgnErr(res.error||'Could not read any moves.');return;}
    const headers=parsePGNHeaders(text);
    if(!res.ok)setPgnErr(`Heads up: ${res.error} Reviewing the first ${res.plies.length} moves.`);
    setAnalyzing(true);setProgress(0);
    await new Promise(r=>setTimeout(r,30));
    const useSF=sfReadyRef.current?await ensureAna():false;
    let out=[];
    if(useSF){
      // Full-strength Stockfish: eval every position (White POV cp; mate as a large ±cp), then derive each move's loss and the engine's best move.
      const N=res.plies.length,MT=Math.max(700,Math.min(2000,Math.round(60000/(N+1))));
      const evW=new Array(N+1),ev2W=new Array(N+1),bU=new Array(N);
      for(let i=0;i<=N;i++){
        const pos=res.positions[i];
        const r=await sfEval1(toFEN(pos),MT);
        let cpW;
        if(!r)cpW=Math.round(evalPawns(pos)*100);
        else if(r.mate!=null)cpW=r.mate>0?(100000-r.mate*100):(-100000-r.mate*100);
        else cpW=(r.cp==null?Math.round(evalPawns(pos)*100):r.cp);
        let cp2W=null;if(r){if(r.mate2!=null)cp2W=r.mate2>0?(100000-r.mate2*100):(-100000-r.mate2*100);else if(r.cp2!=null)cp2W=r.cp2;}
        evW[i]=cpW;ev2W[i]=cp2W;if(i<N)bU[i]=r?r.bestmove:null;
        setProgress((i+1)/(N+1));
      }
      for(let i=0;i<N;i++){
        const pos=res.positions[i],mover=pos.turn,before=evW[i],after=evW[i+1];
        let loss=Math.min(1500,Math.max(0,mover==='w'?(before-after):(after-before)));
        let bestMv=null,bestSan='';const bu=bU[i];
        if(bu){bestMv=uciToMove(pos,bu);if(bestMv)bestSan=toSAN(pos,bestMv,applyMove(pos.board,bestMv));}
        const evA=Math.max(-99,Math.min(99,after/100)),evB=Math.max(-99,Math.min(99,before/100));
        const pl=res.plies[i].move;
        if(bestMv&&bestMv.fr===pl.fr&&bestMv.fc===pl.fc&&bestMv.tr===pl.tr&&bestMv.tc===pl.tc){loss=0;bestSan='';bestMv=null;}
        let cls=isBrilliant(pos,pl,loss,evA,evB)?{label:'Brilliant',c:'#22d3ee',i:'!!'}:classify(loss);
        if(cls.label!=='Brilliant'){const _bm=mover==='w'?before:-before,_pm=mover==='w'?after:-after,_h2=ev2W[i]!=null,_s2=_h2?(mover==='w'?ev2W[i]:-ev2W[i]):null;
          if((cls.label==='Best'||cls.label==='Excellent')&&_h2&&(_bm-_s2)>=160)cls={label:'Great',c:'#7bd3c0',i:'!'};
          else if((cls.label==='Mistake'||cls.label==='Blunder')&&_bm>=200&&_pm<=(_bm-160)&&_pm<130)cls={label:'Miss',c:'#f08a5d',i:'×'};}
        out.push({loss:Math.round(loss),cls,bestSan,bestMove:bestMv,evalAfter:evA});
      }
    }else{
      QDEPTH=2;
      for(let i=0;i<res.plies.length;i++){
        const scored=rankMoves(res.positions[i],2);
        const bestVal=scored[0].v,bestMv=scored[0].m;
        const pl=res.plies[i].move;
        const actual=scored.find(s=>s.m.fr===pl.fr&&s.m.fc===pl.fc&&s.m.tr===pl.tr&&s.m.tc===pl.tc);
        const actualVal=actual?actual.v:(res.positions[i].turn==='w'?-9999:9999);
        const mover=res.positions[i].turn;
        const loss=Math.max(0,mover==='w'?bestVal-actualVal:actualVal-bestVal);
        let bestSan=toSAN(res.positions[i],bestMv,applyMove(res.positions[i].board,bestMv));let _bMv2=bestMv;
        if(bestMv.fr===pl.fr&&bestMv.fc===pl.fc&&bestMv.tr===pl.tr&&bestMv.tc===pl.tc){bestSan='';_bMv2=null;}
        const _evA=evalPawns(res.positions[i+1]);
        const _cls=isBrilliant(res.positions[i],pl,Math.round(loss),_evA)?{label:'Brilliant',c:'#22d3ee',i:'!!'}:classify(loss);
        out.push({loss:Math.round(loss),cls:_cls,bestSan,bestMove:_bMv2,evalAfter:_evA});
        if(i%2===0){setProgress((i+1)/res.plies.length);await new Promise(r=>setTimeout(r,0));}
      }
    }
    // Summary counts
    const counts={Brilliant:0,Great:0,Blunder:0,Mistake:0,Inaccuracy:0};
    out.forEach(o=>{if(counts[o.cls.label]!==undefined)counts[o.cls.label]++;});
    if(meta&&meta.key){
      const uc=meta.userColor;let bril=0,great=0,inacc=0,mist=0,blun=0;
      out.forEach((o,i)=>{const mc=i%2===0?'w':'b';if(uc&&mc!==uc)return;const L=o.cls.label;if(L==='Brilliant')bril++;else if(L==='Best'||L==='Great')great++;else if(L==='Inaccuracy')inacc++;else if(L==='Mistake'||L==='Miss')mist++;else if(L==='Blunder')blun++;});
      recordGameStats(meta.key,{bril,great,inacc,mist,blun});
    }
    const playedSans=res.positions.slice(0,res.plies.length).map((pos,i)=>toSAN(pos,res.plies[i].move,applyMove(pos.board,res.plies[i].move)));
    const openingName=nameOpening(playedSans);
    // Capture the user's Mistakes/Blunders (to practice) and Brilliant moves (to replay)
    try{
      const uc2=meta&&meta.userColor;
      if(uc2){
        const caps=[],bril=[];
        const lastOf=(j)=>{if(j<=0||!res.plies[j-1])return null;const lm=res.plies[j-1].move;return {fr:lm.fr,fc:lm.fc,tr:lm.tr,tc:lm.tc};};
        for(let i=0;i<out.length;i++){
          const mc=i%2===0?'w':'b'; if(mc!==uc2)continue;
          const L=out[i].cls&&out[i].cls.label;
          if((L==='Mistake'||L==='Blunder'||L==='Miss')&&out[i].bestMove&&res.positions[i]){
            const m=out[i].bestMove,u=rc2sq(m.fr,m.fc)+rc2sq(m.tr,m.tc)+(m.promo||'');
            let played='';try{played=toSAN(res.positions[i],res.plies[i].move,applyMove(res.positions[i].board,res.plies[i].move));}catch(e){}
            caps.push({fen:toFEN(res.positions[i]),uci:u,label:L,ts:Date.now(),last:lastOf(i),played});
          } else if(L==='Brilliant'&&res.plies[i]&&res.positions[i]){
            const m=res.plies[i].move,u=rc2sq(m.fr,m.fc)+rc2sq(m.tr,m.tc)+(m.promo||'');
            bril.push({fen:toFEN(res.positions[i]),uci:u,label:'Brilliant',ts:Date.now(),last:lastOf(i)});
          }
        }
        if(caps.length)setMyMistakes(prev=>{const seen=new Set(prev.map(x=>x.fen));const add=caps.filter(c=>!seen.has(c.fen));return add.length?[...add,...prev].slice(0,150):prev;});
        if(bril.length)setMyBrilliant(prev=>{const seen=new Set(prev.map(x=>x.fen));const add=bril.filter(c=>!seen.has(c.fen));return add.length?[...add,...prev].slice(0,80):prev;});
      }
    }catch(e){}
    const bookN=openingBookPlies(playedSans);
    const _sideStats=(side)=>{const c={Brilliant:0,Great:0,Best:0,Good:0,Book:0,Inaccuracy:0,Miss:0,Mistake:0,Blunder:0};let sl=0,n=0;out.forEach((o,i)=>{const mc=i%2===0?'w':'b';if(mc!==side)return;if(i<bookN){c.Book++;return;}const L=o.cls&&o.cls.label;if(L==='Brilliant')c.Brilliant++;else if(L==='Great')c.Great++;else if(L==='Best'||L==='Excellent')c.Best++;else if(L==='Good')c.Good++;else if(L==='Inaccuracy')c.Inaccuracy++;else if(L==='Miss')c.Miss++;else if(L==='Mistake')c.Mistake++;else if(L==='Blunder')c.Blunder++;sl+=Math.max(0,o.loss||0);n++;});const acpl=n?sl/n:0;const acc=Math.max(15,Math.min(99.5,100*Math.exp(-acpl/300)));const rating=Math.max(450,Math.min(2500,Math.round(600+(acc-50)*28)));return {counts:c,moves:n,acpl:Math.round(acpl),accuracy:Math.round(acc*10)/10,rating};};
    const summary={w:_sideStats('w'),b:_sideStats('b'),userColor:(meta&&meta.userColor)||null,book:bookN};
    const _rv={positions:res.positions,plies:res.plies,headers,analysis:out,counts,openingName,summary};
    setReview(_rv);setLastReview(_rv);setReviewView('summary');
    setPly(0);setFlip(false);setAnalyzing(false);setProgress(1);
  };
  const resetReview=()=>{setRevAuto(false);setReview(null);setPgnText('');setPgnErr('');setPly(0);setCcErr('');if(ccGames&&ccGames.length){setTimeout(()=>{try{gamesListRef.current&&gamesListRef.current.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){}},140);}};
  const reviewPlayedGame=()=>{let mvs,uc;if(opponent==='online'){const og=onlineGameRef.current;mvs=(og&&og.moves)||[];uc=myColorRef.current||'w';}else{mvs=((game&&game.history)||[]).map(h=>h.san);uc=(opponent==='computer')?pColor:'w';}if(mvs.length<2)return;let pgn='';for(let i=0;i<mvs.length;i++){if(i%2===0)pgn+=(i/2+1)+'. ';pgn+=mvs[i]+' ';}pgn=pgn.trim();setMode('analyze');setPlaySetup(false);setPgnText(pgn);importGame(pgn,{userColor:uc});};
  const jumpToIssue=(label)=>{setRevAuto(false);if(!review||!review.analysis)return;const idxs=[];review.analysis.forEach((o,i)=>{if(o.cls&&o.cls.label===label)idxs.push(i+1);});if(!idxs.length)return;const nxt=idxs.find(p=>p>ply);setPly(nxt!==undefined?nxt:idxs[0]);};
  const keyPlies=useMemo(()=>{if(!review||!review.analysis)return [];const KS=['Brilliant','Great','Miss','Mistake','Blunder','Inaccuracy'];const out=[];review.analysis.forEach((o,i)=>{if(o.cls&&KS.indexOf(o.cls.label)>=0)out.push(i+1);});return out;},[review]);
  const jumpKey=(d)=>{setRevAuto(false);if(!keyPlies.length)return;let nx;if(d>0){nx=keyPlies.find(p=>p>ply);if(nx===undefined)nx=keyPlies[0];}else{const b=keyPlies.filter(p=>p<ply);nx=b.length?b[b.length-1]:keyPlies[keyPlies.length-1];}setPly(nx);};
  const mergeGames=()=>{const a=[...(ccRawRef.current||[]),...(liRawRef.current||[])];a.sort((x,y)=>(y.date||0)-(x.date||0));setCcGames(a.length?a:null);};
  const fetchChessCom=async()=>{
    const u=chessUser.trim().toLowerCase().replace(/^@/,'');
    if(!u){setCcErr('Enter your Chess.com username first.');return;}
    setCcErr('');setCcLoading(true);
    try{
      const ar=await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/archives`);
      if(!ar.ok)throw new Error(ar.status===404?'username not found':'server '+ar.status);
      const arj=await ar.json();const archives=arj.archives||[];
      if(!archives.length)throw new Error('no games on that account');
      const gr=await fetch(archives[archives.length-1]);const grj=await gr.json();
      const games=(grj.games||[]).filter(g=>g.pgn).slice(-20).reverse();
      if(!games.length)throw new Error('no recent games found');
      ccRawRef.current=games.map(g=>({src:'cc',pgn:g.pgn,white:(g.white&&g.white.username)||'White',black:(g.black&&g.black.username)||'Black',wr:g.white&&g.white.result,tc:g.time_class,date:(g.end_time||0)*1000}));mergeGames();
    }catch(e){setCcErr('Couldn’t reach Chess.com ('+((e&&e.message)||'network blocked')+'). Fetching works once this app is on a real website — the preview sandbox blocks outside connections. You can still paste a PGN below.');}
    setCcLoading(false);
  };
  const ccResult=(g)=>{const w=g.wr;if(w==='win')return g.white+' won';if(['checkmated','resigned','timeout','abandoned','lose','kingofthehill','threecheck','bughousepartnerlose'].includes(w))return g.black+' won';return 'draw';};
  const gkey=(g)=>g.src+':'+(g.date||0)+':'+(g.white||'')+':'+(g.black||'');
  const myName=(src)=>((src==='li'?lichessUser:chessUser)||'').trim().toLowerCase().replace(/^@/,'');
  const gameInfo=(g)=>{const mn=myName(g.src),wl=(g.white||'').toLowerCase(),bl=(g.black||'').toLowerCase();const userColor=mn&&wl===mn?'w':(mn&&bl===mn?'b':null);const opp=userColor==='w'?g.black:(userColor==='b'?g.white:null);const w=g.wr;const whiteRes=w==='win'?'w':(['checkmated','resigned','timeout','abandoned','lose','kingofthehill','threecheck','bughousepartnerlose'].includes(w)?'b':'draw');const code=whiteRes==='draw'?'draw':(userColor?(whiteRes===userColor?'win':'loss'):null);return {userColor,opp,code};};
  const tcLabel=(tc)=>{if(!tc)return '';const t=String(tc);return t.charAt(0).toUpperCase()+t.slice(1);};
  const outcomeBadge=(code)=>code==='win'?{t:'WON',c:'#bff0c0',bg:'rgba(111,214,111,.18)',br:'rgba(111,214,111,.45)'}:code==='loss'?{t:'LOST',c:'#ffc2bc',bg:'rgba(236,92,78,.16)',br:'rgba(236,92,78,.45)'}:code==='draw'?{t:'DRAW',c:'#e2e6ee',bg:'rgba(255,255,255,.10)',br:'rgba(255,255,255,.24)'}:{t:'GAME',c:'rgba(255,255,255,.6)',bg:'rgba(255,255,255,.06)',br:'rgba(255,255,255,.16)'};
  const fetchLichess=async()=>{
    const u=lichessUser.trim().replace(/^@/,'');
    if(!u){setCcErr('Enter your Lichess username first.');return;}
    setCcErr('');setCcLoading(true);
    try{
      const r=await fetch(`https://lichess.org/api/games/user/${encodeURIComponent(u)}?max=20&pgnInJson=true&clocks=false&evals=false&sort=dateDesc`,{headers:{Accept:'application/x-ndjson'}});
      if(!r.ok)throw new Error(r.status===404?'username not found':'server '+r.status);
      const txt=await r.text();const lines=txt.trim().split('\n').filter(Boolean);
      if(!lines.length)throw new Error('no games on that account');
      const games=lines.map(l=>{try{return JSON.parse(l);}catch{return null;}}).filter(g=>g&&g.pgn);
      if(!games.length)throw new Error('no recent games found');
      liRawRef.current=games.map(g=>{const wn=(g.players&&g.players.white&&g.players.white.user&&g.players.white.user.name)||'White';const bn=(g.players&&g.players.black&&g.players.black.user&&g.players.black.user.name)||'Black';return {src:'li',pgn:g.pgn,white:wn,black:bn,wr:g.winner==='white'?'win':(g.winner==='black'?'resigned':'draw'),tc:g.speed||'game',date:g.lastMoveAt||g.createdAt||0};});mergeGames();
    }catch(e){setCcErr('Couldn’t reach Lichess ('+((e&&e.message)||'network blocked')+'). Fetching works once this app is on a real website; the preview sandbox blocks outside connections. You can still paste a PGN below.');}
    setCcLoading(false);
  };
  const pickCcGame=(g)=>{const info=gameInfo(g);setPgnText(g.pgn);importGame(g.pgn,{key:gkey(g),userColor:info.userColor});};
  useEffect(()=>{if(mode!=='analyze'||gamesAutoRef.current)return;const cu=chessUser.trim(),lu=lichessUser.trim();if(cu||lu){gamesAutoRef.current=true;if(cu)fetchChessCom();if(lu)fetchLichess();}},[mode]);
  useEffect(()=>{analyzingRef.current=analyzing;},[analyzing]);
  // Background pass: fill in move-quality counts for every fetched game, one at a time, only while on the Review screen, pausing while a manual review is computing.
  useEffect(()=>{
    if(mode!=='analyze'||!ccGames||!ccGames.length)return;
    let cancelled=false;
    (async()=>{
      for(const g of ccGames){
        if(cancelled)return;
        const k=gkey(g);
        if(gameStatsRef.current[k])continue;
        while(analyzingRef.current&&!cancelled)await new Promise(r=>setTimeout(r,150));
        if(cancelled)return;
        const c=await analyzeGameCounts(g.pgn,gameInfo(g).userColor);
        if(cancelled)return;
        if(c)recordGameStats(k,c);
        await new Promise(r=>setTimeout(r,60));
      }
    })();
    return ()=>{cancelled=true;};
  },[ccGames,mode]);

  // ── Move handling ──
  // Record a solved puzzle into persistent progress; returns the new tier if the player just ranked up.
  const recordSolve=(p)=>{
    if(!p||!p.id)return null;
    const map=pzSolvedRef.current, already=!!map[p.id];
    const nmap=already?map:{...map,[p.id]:1};
    const rankBefore=pzRank(map);
    const nstreak=pzStreakRef.current+1, nbest=Math.max(pzBestRef.current,nstreak);
    const nxp=pzXPRef.current+(already?2:Math.max(5,Math.round((p.rating||800)/10)));
    setPzSolvedMap(nmap);setPzStreak(nstreak);setPzBest(nbest);setPzXP(nxp);
    PZSTORE.set(PZKEY,JSON.stringify({solved:nmap,streak:nstreak,best:nbest,xp:nxp,online:pzOSolvedRef.current,onlineIds:pzOSolvedIdsRef.current}));
    const rankAfter=pzRank(nmap);
    bumpDaily();
    return rankAfter>rankBefore?PZ_TIERS[rankAfter-1]:null;
  };
  const pzBreakStreak=()=>{if(pzStreakRef.current>0){setPzStreak(0);PZSTORE.set(PZKEY,JSON.stringify({solved:pzSolvedRef.current,streak:0,best:pzBestRef.current,xp:pzXPRef.current,online:pzOSolvedRef.current,onlineIds:pzOSolvedIdsRef.current}));}};
  const LEARN_GOAL=10;
  const linesOf=(op)=>{const a=[{key:op.name,name:'Main line'}];(op.vars||[]).forEach(v=>a.push({key:op.name+'§'+v.name,name:v.name}));return a;};
  const lineDays=(k)=>{const c=learnProgRef.current[k];return (c&&Array.isArray(c.days))?c.days:[];};
  const lessonStats=(op)=>{const ls=linesOf(op);const u=new Set();let lr=0;ls.forEach(l=>{const d=lineDays(l.key);if(d.length>=1)lr++;d.forEach(x=>u.add(x));});return {lines:ls.length,linesLearned:lr,unionDays:u.size,coverage:lr>=ls.length,mastered:(u.size>=LEARN_GOAL&&lr>=ls.length)};};
  const finishRep=()=>{
    const op=LIB[openIdxRef.current]; if(!op)return '';
    const rep=learnRepRef.current||{}; learnRepRef.current={hints:false,miss:false};
    const key=learnKeyRef.current||op.name;
    const st0=lessonStats(op);
    const cur=learnProgRef.current[key]||{};
    const days=Array.isArray(cur.days)?cur.days.slice():[];
    if(rep.hints)return days.length?'':' Nice run with hints on. Hints-off runs are the ones that bank days.';
    if(rep.miss)return days.length?' A wrong try slipped in, so no day banked. Flawless runs only.':' A wrong try slipped in. Learned needs one flawless run: no hints, no wrong tries. You are close.';
    const lockedUntil=(hintLockRef.current&&hintLockRef.current[op.name])||0;
    if(Date.now()<lockedUntil){const mins=Math.max(1,Math.ceil((lockedUntil-Date.now())/60000));return ' Flawless, but hints were on for this lesson in the last 10 minutes. It can bank a day again in about '+mins+' min.';}
    const today=dstr(new Date());
    const wasM=days.length>=LEARN_GOAL;
    const first=days.length===0;
    if(days.indexOf(today)>=0)return ' Flawless again. Today is already banked, tomorrow counts next.';
    days.push(today);
    setLearnProg(p=>({...p,[key]:{learned:true,days}}));
    const stN=lessonStats(op);
    const tail=(stN.lines>1)?(' Lines learned: '+stN.linesLearned+'/'+stN.lines+'.'):'';
    if(stN.mastered){if(!st0.mastered)setCelebrate({kind:'mastered',title:op.name,sub:LEARN_GOAL+' flawless days · every line learned'});return st0.mastered?' Still mastered. \ud83c\udfc5':' \ud83c\udfc5 MASTERED \u00b7 '+LEARN_GOAL+' flawless days across the whole lesson. Seriously impressive.';}
    if(stN.coverage&&!st0.coverage&&stN.lines>1){setCelebrate({kind:'learned',title:op.name,sub:'Every line learned · '+stN.unionDays+' of '+LEARN_GOAL+' days to Mastered'});return ' Flawless \u00b7 that was the last line: whole lesson Learned \u2713. '+stN.unionDays+' of '+LEARN_GOAL+' days toward Mastered.';}
    if(first&&stN.lines>1){setCelebrate({kind:'bank',title:'Line learned · flawless',sub:op.name+' · '+stN.linesLearned+'/'+stN.lines+' lines'});return ' Flawless \u00b7 this line is Learned \u2713.'+tail+' '+stN.unionDays+' of '+LEARN_GOAL+' days toward Mastered.';}
    if(first){setCelebrate({kind:'learned',title:op.name,sub:'Day 1 of '+LEARN_GOAL+' to Mastered'});return ' Flawless \u00b7 Learned \u2713 and day 1 of '+LEARN_GOAL+' toward Mastered.';}
    setCelebrate({kind:'bank',title:'Day '+stN.unionDays+' banked · flawless',sub:op.name+' · '+Math.max(0,LEARN_GOAL-stN.unionDays)+' to Mastered'});
    return ' Flawless \u00b7 day '+stN.unionDays+' of '+LEARN_GOAL+' toward Mastered.'+tail;
  };
  const sfxMove=(gB,mv)=>{try{if(!gB||!mv)return;const ng=makeMove(gB,mv);let k='move';if(ng&&ng.board&&isInCheck(ng.board,ng.turn))k='check';else if(mv.castle)k='castle';else if(mv.promo)k='promote';else if((gB.board&&gB.board[mv.tr]&&gB.board[mv.tr][mv.tc])||mv.epCap)k='capture';playSfx(k);}catch(e){}};
  const doMove=(g,mv)=>{
    if(modeRef.current==='puzzle'){
      if(puzSolvedRef.current){UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();return;}
      const p=curPuzRef.current;const step=puzStepRef.current;
      if(!p||step>=p.sol.length){UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();return;}
      const nb=applyMove(g.board,mv);const played=toSAN(g,mv,nb);
      const ng=makeMove(g,mv);const isMate=getStatus(ng)==='checkmate';
      const matchesLine=cleanSAN(played)===cleanSAN(p.sol[step]);
      if(isMate||matchesLine){
        setGame(ng);setLastMv(mv);setPuzReveal(false);UI.current={sel:null,tgts:[],drag:null,dragging:false};
        const s=step+1;
        if(isMate||s>=p.sol.length){
          setPuzStep(p.sol.length);setPuzSolved(true);setPzBurst(Date.now());setTimeout(()=>setPzBurst(0),1200);
          const alt=isMate&&!matchesLine;
          if(p.ext){onlineSolved(p);setPuzMsg('🎉 '+(alt?'Checkmate — that works too! ':'')+p.explain);}
          else{setPuzDone(d=>({...d,[puzIdxRef.current]:true}));const ru=recordSolve(p);if(ru)setPzCelebrate(ru);setPuzMsg('🎉 '+(alt?'Checkmate — that works too! ':'Solved! ')+p.explain+(ru?'   ⬆ Rank up — you reached '+ru.icon+' '+ru.name+'!':''));}
        }else{setPuzMsg('✓ '+played+' — good! Now finish it.');const rep=p.reply&&p.reply[step];if(rep){setTimeout(()=>{const omv=findMoveBySAN(ng,rep);if(omv){setGame(g2=>makeMove(g2,omv));setLastMv(omv);}setPuzStep(s);},450);}else setPuzStep(s);}
        repaint();
      }else{pzBreakStreak();setPuzMsg('✗ '+played+" isn't it — try again. (Tap 💡 for a hint.)");UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();}
      return;
    }
    if(modeRef.current==='learn'&&learnPhaseRef.current==='practice'){
      const line=learnLineRef.current;const step=openStepRef.current;
      if(step>=line.length){UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();return;}
      const nb=applyMove(g.board,mv);const played=toSAN(g,mv,nb);
      const ng=makeMove(g,mv);const isMate=getStatus(ng)==='checkmate';
      const matches=cleanSAN(played)===cleanSAN(line[step]);
      if(matches||isMate){
        setGame(ng);setLastMv(mv);setRevealHint(false);UI.current={sel:null,tgts:[],drag:null,dragging:false};
        if(isMate&&!matches){setOpenStep(line.length);setOpenMsg('🎉 '+played+' is checkmate — that works too! Any legal mate ends the game.');repaint();return;}
        let s=step+1;setOpenMsg('✓ '+played+' — correct!');
        if(s<line.length){setTimeout(()=>{const omv=findMoveBySAN(ng,line[s]);if(omv){setGame(g2=>makeMove(g2,omv));setLastMv(omv);setOpenStep(s+1);if(s+1>=line.length)setOpenMsg('🎉 Complete! That\'s the '+learnLabel+'.'+finishRep());}},420);setOpenStep(s);}
        else{setOpenStep(s);setOpenMsg('🎉 Complete! That\'s the '+learnLabel+'.'+finishRep());}
        repaint();
      }else{learnRepRef.current.miss=true;setOpenMsg(showHintRef.current?('✗ Not the book move — it goes '+line[step]+' here. Try again.'):('✗ '+played+" isn't the line — try again. (Tap 💡 Hint to see it.)"));UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();}
      return;
    }
    if(modeRef.current==='play'&&opponentRef.current==='online'){
      const og=onlineGameRef.current;
      if(!og||og.result||og.status!=='active'||myColorRef.current!==g.turn){UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();return;}
      // Rebuild the authoritative position from the synced move list and apply THIS move on top of it.
      // A briefly-stale local board can then never push an out-of-sync or illegal move.
      const moves=og.moves||[];
      let auth=initGame(),ok=true;
      for(const s of moves){const m=findMoveBySAN(auth,s);if(!m){ok=false;break;}auth=makeMove(auth,m);}
      if(!ok||auth.turn!==myColorRef.current){setOnlineInfo('Syncing… give it a second and tap your move again.');UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();return;}
      const authMv=getLegal(auth).find(x=>x.fr===mv.fr&&x.fc===mv.fc&&x.tr===mv.tr&&x.tc===mv.tc&&(x.promo||null)===(mv.promo||null));
      if(!authMv){setOnlineInfo('Syncing… give it a second and tap your move again.');UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();return;}
      const nb=applyMove(auth.board,authMv);const san=toSAN(auth,authMv,nb);const ng=makeMove(auth,authMv);
      setGame(ng);setLastMv(authMv);setPlayHintMv(null);UI.current={sel:null,tgts:[],drag:null,dragging:false};
      const st=getStatus(ng);const _now=Date.now();const push={moves:[...moves,san],drawBy:null,moveAt:_now};
      if(og.tc&&og.tc.kind!=='corr'&&og.tc.init&&og.clk){const _mc=myColorRef.current,_oc=(_mc==='w'?'b':'w');const _used=_now-(og.moveAt||_now);const _rem=Math.max(0,(og.clk[_mc]||0)-_used)+((og.tc.inc||0)*1000);push.clk={};push.clk[_mc]=_rem;push.clk[_oc]=(og.clk[_oc]||0);if(_rem<=0){push.result=(_mc==='w'?'0-1':'1-0');push.status='over';push.endBy='time';}}
      if(st==='checkmate'){push.result=(auth.turn==='w'?'1-0':'0-1');push.status='over';push.endBy='mate';}
      else if(st==='stalemate'){push.result='1/2-1/2';push.status='over';push.endBy='stalemate';}
      if(window.CTCloud)window.CTCloud.gamePush(og.id,push).catch(err=>{const c=(err&&(err.code||err.message))||'error';setOnlineInfo('Move not saved ('+c+'). Check your connection; if it mentions permissions, the database rules need a tweak.');});
      repaint();return;
    }
    if(modeRef.current==='play'){setPlayHist(h=>[...h,g]);const tc=timeCtrlRef.current;if(tc&&tc.kind!=='corr'){const mover=g.turn;setClock(c=>({...c,run:true,[mover]:c[mover]+tc.inc*1000}));}}
    setPlayHintMv(null);
    sfxMove(g,mv);setGame(makeMove(g,mv));setLastMv(mv);UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();
  };

  // Commit a move to (r,c); if it's a pawn promotion with a choice, open the picker instead
  const commitOrPromote=(g,tgts,r,c)=>{
    const opts=tgts.filter(m=>m.tr===r&&m.tc===c);
    if(opts.length===0){
      // alternate castle gesture: king dragged/tapped onto its own rook
      const cm=matchTarget(tgts,r,c);
      if(cm){doMove(g,cm);return true;}
      return false;
    }
    const proms=opts.filter(m=>m.promo);
    if(proms.length>1){setPromo({g,choices:proms,tr:r,tc:c});UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();return true;}
    doMove(g,opts[0]);return true;
  };

  const takeback=()=>{
    if(mode!=='play'||playHist.length===0||opponent==='online')return;
    const arr=playHist.slice();let g=arr.pop();
    if(opponent==='computer'){while(g&&g.turn!==pColor&&arr.length){g=arr.pop();}}
    if(!g)return;
    setGame(g);setLastMv(null);setPlayHintMv(null);setPlayHist(arr);setPreMv(null);UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();
  };
  const requestHint=()=>{
    if(mode!=='play')return;
    if(getStatus(game)==='checkmate'||getStatus(game)==='stalemate')return;
    if(opponent==='computer'&&game.turn!==pColor)return;
    QDEPTH=2;const mv=bestMove(game,3,0);if(mv)setPlayHintMv(mv);
  };
  const resign=()=>{
    if(mode!=='play'||playEnd)return;
    const st=getStatus(game);if(st==='checkmate'||st==='stalemate')return;
    const loser=opponent==='computer'?pColor:game.turn;
    setThinking(false);setPreMv(null);setPlayEnd({reason:'resign',winner:opp(loser)});setClock(c=>({...c,run:false}));
  };

  // ─── Online multiplayer handlers ───
  const scanBoardFile=(file)=>{
    if(!file) return;
    const C=(typeof window!=='undefined')?window.CTCloud:null;
    if(!C||!C.scanBoard){ setScanMsg('Board scanning is not set up on this build yet.'); return; }
    setScanBusy(true); setScanMsg('Reading the board…');
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=async()=>{
      try{ URL.revokeObjectURL(url); }catch(_){}
      try{
        const max=1024; let w=img.naturalWidth||img.width||0, h=img.naturalHeight||img.height||0;
        if(!w||!h){ setScanBusy(false); setScanMsg('Could not open that image.'); return; }
        const sc=Math.min(1,max/Math.max(w,h)); w=Math.max(1,Math.round(w*sc)); h=Math.max(1,Math.round(h*sc));
        const cv=document.createElement('canvas'); cv.width=w; cv.height=h; cv.getContext('2d').drawImage(img,0,0,w,h);
        const b64=cv.toDataURL('image/jpeg',0.85).split(',')[1];
        const r=await C.scanBoard(b64);
        const fen=r&&r.fen;
        if(!fen){ setScanBusy(false); setScanMsg('Could not read the board. Try a clearer, straight-on, well-lit photo with the whole board in frame.'); return; }
        const pp=String(fen).split(/\s+/)[0]||'';
        if((pp.match(/K/g)||[]).length<1 || (pp.match(/k/g)||[]).length<1){ setScanBusy(false); setScanMsg('That photo did not read as a full chess position. Try again with the whole board in frame.'); return; }
        let g=null; try{ g=fromFEN(fen); }catch(e){ g=null; }
        if(!g){ setScanBusy(false); setScanMsg('The scan came back unreadable. Try another photo.'); return; }
        setScanBusy(false); setScanMsg('');
        setSetupFromFEN(fen); setOpponent('computer'); setPColor(g.turn); setTimeCtrl(null); timeCtrlRef.current=null; setOpenIdx(null); setMode('play'); setHomeScreen(false); setPlaySetup(true);
      }catch(e){
        setScanBusy(false);
        const m=e&&e.message;
        setScanMsg(m==='unauthenticated'?'Sign in first to scan a board.':m==='cloud-not-ready'?'Board scanning is not set up yet (the cloud function still needs to be deployed).':'Could not read the board right now. Please try again.');
      }
    };
    img.onerror=()=>{ try{URL.revokeObjectURL(url);}catch(_){} setScanBusy(false); setScanMsg('Could not open that image.'); };
    img.src=url;
  };
  const nearbyJoin=()=>{
    if(!cloudUser){ setUpgradeMsg('Sign in to play nearby players.'); setAcctOpen(true); return; }
    if(typeof navigator==='undefined'||!navigator.geolocation){ setNearbyMsg('Location is not available here. Enter your ZIP or postcode below instead.'); return; }
    setNearbyBusy(true); setNearbyMsg('Finding players near you…');
    navigator.geolocation.getCurrentPosition(async(pos)=>{
      try{
        const lat=Math.round(pos.coords.latitude*10)/10, lng=Math.round(pos.coords.longitude*10)/10;
        const cell='geo:'+lat+','+lng;
        await window.CTCloud.nearbyJoin(cell,(cloudUser&&cloudUser.name)||'Player');
        setNearbyGeo(cell); setNearbyBusy(false); setNearbyMsg('');
      }catch(e){ setNearbyBusy(false); setNearbyMsg('Could not turn on nearby right now. Please try again.'); }
    },()=>{ setNearbyBusy(false); setNearbyMsg('Location was blocked. You can enter your ZIP or postcode below instead.'); },{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  };
  const nearbyJoinZip=async()=>{
    const z=nearbyZip.trim();
    if(!cloudUser){ setUpgradeMsg('Sign in to play nearby players.'); setAcctOpen(true); return; }
    if(!z){ setNearbyMsg('Enter your ZIP or postcode first.'); return; }
    setNearbyBusy(true); setNearbyMsg('Turning on nearby…');
    try{
      const cell='zip:'+z.toLowerCase().replace(/\s+/g,'');
      await window.CTCloud.nearbyJoin(cell,(cloudUser&&cloudUser.name)||'Player');
      setNearbyGeo(cell); setNearbyBusy(false); setNearbyMsg('');
    }catch(e){ setNearbyBusy(false); setNearbyMsg('Could not turn on nearby right now. Please try again.'); }
  };
  const nearbyLeave=async()=>{
    try{ await window.CTCloud.nearbyLeave(); }catch(e){}
    setNearbyGeo(null); setNearbyData([]); setNearbyMsg('You are no longer visible to nearby players.');
  };
  const nearbyChallenge=(p)=>{
    setNearbyOpen(false); setHomeScreen(false); setMode('play'); setOpponent('online'); setOnlineGame(null); setMyColor(null); setOnlineErr(''); setPlaySetup(false);
    setOnlineInfo('Game created. Send '+((p&&p.name)||'them')+' your invite code to start.');
    setTimeout(function(){ try{ onlineCreate('w'); }catch(e){} },0);
  };
  const onlineCreate=async(color)=>{const C=window.CTCloud;
    if(!cloudUser||!C){setOnlineErr('Sign in first — open ☰ menu → Account.');return;}
    setOnlineErr('');setOnlineInfo('Creating game…');
    try{const tc=timeCtrlRef.current||null;const r=await C.gameCreate(color,tc);setMyColor(color);
      C.gameWatch(r.id,d=>{if(d)setOnlineGame(Object.assign({},d,{id:r.id}));});
      setOnlineGame({id:r.id,code:r.code,status:'waiting',moves:[],chat:[],tc:tc,moveAt:Date.now(),[color==='b'?'b':'w']:{uid:cloudUser.uid,name:cloudUser.name}});
      setOnlineInfo('');fullReset();
    }catch(e){setOnlineErr('Could not create the game. Try again.');setOnlineInfo('');}};
  const onlineJoin=async(codeArg)=>{const C=window.CTCloud;
    if(!cloudUser||!C){setOnlineErr('Sign in first — open ☰ menu → Account.');return;}
    const code=String((codeArg!=null?codeArg:onlineCodeInput)||'').trim().toUpperCase();
    if(code.length<4){setOnlineErr('Enter the 5-letter code your friend shared.');return;}
    setOnlineErr('');setOnlineInfo('Joining…');
    try{const r=await C.gameJoin(code);setMyColor(r.color);
      C.gameWatch(r.id,d=>{if(d)setOnlineGame(Object.assign({},d,{id:r.id}));});
      setOnlineCodeInput('');setOnlineInfo('');
    }catch(e){const m=e&&e.message;setOnlineErr(m==='notfound'?'No game found with that code.':m==='full'?'That game is already full.':'Could not join. Check the code and your connection.');setOnlineInfo('');}};
  const onlineLeave=()=>{const C=window.CTCloud;if(C){C.gameLeave();C.mmCancel();}setMmSearching(false);setOnlineGame(null);setMyColor(null);setOnlineErr('');setOnlineInfo('');fullReset();};
  const onlineQuickMatch=async()=>{const C=window.CTCloud;if(!cloudUser||!C){setOnlineErr('Sign in first — open ☰ menu → Account.');return;}setOnlineErr('');setOnlineInfo('');setMmSearching(true);try{await C.mmFind(timeCtrlRef.current||null,(m)=>{if(!m||!m.id)return;setMmSearching(false);setMyColor(m.color);C.gameWatch(m.id,d=>{if(d)setOnlineGame(Object.assign({},d,{id:m.id}));});fullReset();});}catch(e){setMmSearching(false);setOnlineErr('Matchmaking is unavailable right now — you can still play by invite code.');}};
  const onlineCancelMatch=()=>{const C=window.CTCloud;if(C)C.mmCancel();setMmSearching(false);setOnlineInfo('');};
  const refreshMyGames=async()=>{const C=window.CTCloud;if(!C||!C.gameList||!cloudUser){setMyGames([]);return;}setMyGamesLoading(true);try{const list=await C.gameList();setMyGames(Array.isArray(list)?list:[]);}catch(e){setMyGames([]);}setMyGamesLoading(false);};
  const resumeGame=(code)=>{setOnlineErr('');setOnlineInfo('Opening your game…');onlineJoin(code);};
  const onlineClaimTime=()=>{const og=onlineGameRef.current,C=window.CTCloud;if(!og||og.result||!C||!og.tc||og.tc.kind!=='corr')return;const result=myColorRef.current==='w'?'1-0':'0-1';C.gamePush(og.id,{result,status:'over'});};
  const onlineClaimFlag=()=>{const og=onlineGameRef.current,C=window.CTCloud;if(!og||og.result||!C||!og.tc||og.tc.kind==='corr'||!og.clk)return;const side=gameRef.current.turn;const rem=Math.max(0,(og.clk[side]||0)-(Date.now()-(og.moveAt||Date.now())));if(rem>0)return;const result=side==='w'?'0-1':'1-0';C.gamePush(og.id,{result,status:'over',endBy:'time'});};
  const onlineResign=()=>{const og=onlineGameRef.current,C=window.CTCloud;if(!og||og.result||!C)return;const result=myColorRef.current==='w'?'0-1':'1-0';C.gamePush(og.id,{result,status:'over',endBy:'resign',resignedBy:myColorRef.current,drawBy:null});};
  const onlineOfferRematch=()=>{const og=onlineGameRef.current,C=window.CTCloud;if(!og||!og.result||!C)return;C.gamePush(og.id,{rematchBy:myColorRef.current,notice:null});setOnlineInfo('');};
  const onlineCancelRematch=()=>{const og=onlineGameRef.current,C=window.CTCloud;if(!og||!C)return;C.gamePush(og.id,{rematchBy:null});};
  const onlineAcceptRematch=()=>{const og=onlineGameRef.current,C=window.CTCloud;if(!og||!C)return;C.gamePush(og.id,{moves:[],result:null,status:'active',drawBy:null,rematchBy:null,notice:null,endBy:null,resignedBy:null,moveAt:Date.now()});setOnlineInfo('');setConfirmResign(false);};
  const onlineDeclineRematch=()=>{const og=onlineGameRef.current,C=window.CTCloud;if(!og||!C)return;C.gamePush(og.id,{rematchBy:null,notice:{for:og.rematchBy,msg:'Rematch declined',t:Date.now()}});};
  const onlineOfferDraw=()=>{const og=onlineGameRef.current,C=window.CTCloud;if(!og||og.result||!C)return;C.gamePush(og.id,{drawBy:myColorRef.current,notice:null});};
  const onlineAcceptDraw=()=>{const og=onlineGameRef.current,C=window.CTCloud;if(!og||!C)return;C.gamePush(og.id,{result:'1/2-1/2',status:'over',drawBy:null,endBy:'draw',notice:null});};
  const onlineDeclineDraw=()=>{const og=onlineGameRef.current,C=window.CTCloud;if(!og||!C)return;C.gamePush(og.id,{drawBy:null,notice:{for:og.drawBy,msg:'Draw declined',t:Date.now()}});};
  const onlineDismissNotice=()=>{const og=onlineGameRef.current,C=window.CTCloud;if(!og||!C)return;C.gamePush(og.id,{notice:null});};
  // Shared invite link (?g=CODE): land on the Online tab with the code prefilled, then auto-join once signed in
  useEffect(()=>{if(pendingJoin){setOpponent('online');setMode('play');setPlaySetup(false);setOnlineCodeInput(pendingJoin);}},[]);
  useEffect(()=>{
    if(!pendingJoin||!cloudUser||!window.CTCloud||onlineGame)return;
    setOpponent('online');setMode('play');setPlaySetup(false);
    onlineJoin(pendingJoin);
    setPendingJoin(null);
    try{window.history.replaceState(null,'',window.location.pathname);}catch(e){}
  },[pendingJoin,cloudUser,onlineGame]);
  // Account-based games: load the player's ongoing games when they open the Online lobby
  useEffect(()=>{if(opponent==='online'&&cloudUser&&!onlineGame){refreshMyGames();}},[opponent,cloudUser,onlineGame]);
  // Keep multi-day "time left" labels fresh
  useEffect(()=>{if(opponent!=='online')return;const iv=setInterval(()=>setCorrNow(Date.now()),30000);return ()=>clearInterval(iv);},[opponent]);
  useEffect(()=>{const og=onlineGame;if(opponent!=='online'||!og||og.result||og.status!=='active'||!og.tc||og.tc.kind==='corr'||!og.clk)return;const iv=setInterval(()=>setLiveNow(Date.now()),250);return ()=>clearInterval(iv);},[opponent,onlineGame&&onlineGame.status,onlineGame&&onlineGame.result,onlineGame&&onlineGame.moveAt,onlineGame&&onlineGame.clk&&(onlineGame.clk.w+'|'+onlineGame.clk.b)]);
  const onlineSendChat=()=>{const og=onlineGameRef.current,C=window.CTCloud,t=String(chatInput||'').trim();if(!og||!t||!C||!cloudUser)return;C.gameChat(og.id,{uid:cloudUser.uid,name:(cloudUser.name||'Player'),text:t.slice(0,240),t:Date.now()});setChatInput('');};

  const humanCanMove=()=>{
    if(modeRef.current==='analyze')return false;
    if(modeRef.current==='puzzle')return !puzSolvedRef.current&&gameRef.current.turn===puzSideRef.current;
    if(getStatus(gameRef.current)==='checkmate'||getStatus(gameRef.current)==='stalemate')return false;
    if(modeRef.current==='play'&&opponentRef.current==='online'){const og=onlineGameRef.current;return !!og&&og.status==='active'&&!og.result&&myColorRef.current===gameRef.current.turn;}
    if(modeRef.current==='play'&&opponent==='computer'&&gameRef.current.turn!==pColor)return false;
    if(modeRef.current==='learn'){if(learnPhaseRef.current!=='practice')return false;const op=LIB[openIdxRef.current];const line=learnLineRef.current;if(!op||openStepRef.current>=line.length||gameRef.current.turn!==op.side)return false;}
    return true;
  };

  const canPreMoveNow=()=>{
    if(modeRef.current!=='play')return null;
    const g=gameRef.current;const st=getStatus(g);
    if(st==='checkmate'||st==='stalemate')return null;
    if(opponentRef.current==='online'){const og=onlineGameRef.current;if(og&&og.status==='active'&&!og.result&&myColorRef.current&&myColorRef.current!==g.turn)return myColorRef.current;return null;}
    if(opponentRef.current==='computer'){if(!playEndRef.current&&g.turn!==pColor)return pColor;return null;}
    return null;
  };
  const getSquare=(cx,cy)=>{const rect=boardRef.current?.getBoundingClientRect();if(!rect)return null;const x=cx-rect.left,y=cy-rect.top;const dC=Math.floor(x/SQ),dR=Math.floor(y/SQ);if(dR<0||dR>=8||dC<0||dC>=8)return null;const f=flipRef.current;return[f?7-dR:dR,f?7-dC:dC];};
  const canMoveNow=humanCanMove();
  const onPtrDown=(e)=>{if(e.pointerType==='touch'&&(e.clientX<=10||e.clientX>=((window.innerWidth||9999)-10)))return;if(modeRef.current==='play'&&pvIdxRef.current!=null){setPvIdx(null);UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();return;}if(modeRef.current==='learn'&&learnPhaseRef.current==='practice'&&lpvRef.current!=null){setLpv(null);UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();return;}if(!humanCanMove()){const pmc=canPreMoveNow();if(pmc){e.preventDefault();const sq=getSquare(e.clientX,e.clientY);const g=gameRef.current;const ui=UI.current;if(preMvRef.current)setPreMv(null);if(sq){const[r,c]=sq;const piece=g.board[r][c];if(piece&&piece.c===pmc){if(ui.sel&&ui.sel[0]===r&&ui.sel[1]===c)UI.current={sel:null,tgts:[],drag:null,dragging:false};else UI.current={sel:[r,c],tgts:[],drag:{from:[r,c],piece,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY},dragging:false};}else if(ui.sel){const[fr,fc]=ui.sel;const p2=g.board[fr][fc];if(p2&&p2.c===pmc)setPreMv({fr,fc,tr:r,tc:c});UI.current={sel:null,tgts:[],drag:null,dragging:false};}else UI.current={sel:null,tgts:[],drag:null,dragging:false};}repaint();return;}return;}e.preventDefault();const sq=getSquare(e.clientX,e.clientY);if(!sq)return;const[r,c]=sq;const g=gameRef.current;const ui=UI.current;if(ui.sel){if(commitOrPromote(g,ui.tgts,r,c))return;}const piece=g.board[r][c];if(piece&&piece.c===g.turn){if(ui.sel?.[0]===r&&ui.sel?.[1]===c)UI.current={sel:null,tgts:[],drag:null,dragging:false};else{const moves=getMovesFrom(g,r,c);UI.current={sel:[r,c],tgts:moves,drag:{from:[r,c],piece,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY},dragging:false};}}else UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();};
  const onPtrMove=(e)=>{const ui=UI.current;if(!ui.drag)return;e.preventDefault();const dx=e.clientX-ui.drag.sx,dy=e.clientY-ui.drag.sy;const dragging=ui.dragging||(dx*dx+dy*dy>30);UI.current={...ui,drag:{...ui.drag,x:e.clientX,y:e.clientY},dragging};repaint();};
  const onPtrUp=(e)=>{try{e.currentTarget.releasePointerCapture(e.pointerId);}catch(_){}const ui=UI.current;if(!ui.drag)return;e.preventDefault();if(ui.dragging){const sq=getSquare(e.clientX,e.clientY);if(sq){const[r,c]=sq;if(commitOrPromote(gameRef.current,ui.tgts,r,c))return;const pmc=canPreMoveNow();const g=gameRef.current;const fp=g.board[ui.drag.from[0]][ui.drag.from[1]];if(pmc&&fp&&fp.c===pmc&&!(ui.drag.from[0]===r&&ui.drag.from[1]===c)){setPreMv({fr:ui.drag.from[0],fc:ui.drag.from[1],tr:r,tc:c});UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();return;}}}UI.current={...ui,drag:null,dragging:false};repaint();};
  const onPtrCancel=(e)=>{try{e.currentTarget.releasePointerCapture(e.pointerId);}catch(_){}const ui=UI.current;if(ui.drag||ui.dragging){UI.current={...ui,drag:null,dragging:false};repaint();}};

  const hintMove=useMemo(()=>{if(mode==='play')return playHintMv;if(mode==='puzzle'){if(!puzReveal||puzSolved)return null;const p=curPuz;if(!p||puzStep>=p.sol.length)return null;return findMoveBySAN(game,p.sol[puzStep]);}if(mode!=='learn'||learnPhase!=='practice'||openIdx===null||(!showHint&&!revealHint))return null;const op=LIB[openIdx];if(openStep>=learnLine.length||game.turn!==op.side)return null;return findMoveBySAN(game,learnLine[openStep]);},[mode,learnPhase,openIdx,openStep,game,showHint,revealHint,learnLine,puzReveal,puzSolved,curPuz,puzStep,playHintMv]);
  // Best move arrow in review
  const reviewBest=useMemo(()=>{if(!inReview||!showBest||ply===0)return null;return review.analysis[ply-1]?.bestMove||null;},[inReview,showBest,ply,review]);

  const{sel:_uSel,tgts:_uTgts,drag,dragging}=UI.current;const sel=_pvLive?null:_uSel;const tgts=_pvLive?[]:_uTgts;
  const dBoard=flip?[...boardGame.board].reverse().map(r=>[...r].reverse()):boardGame.board;
  const kpInfo=(()=>{const B=boardGame.board;if(!B)return null;let pawn=null,wk=null,bk=null,pawns=0,others=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=B[r][c];if(!p)continue;if(p.t==='p'){pawn={r,c,col:p.c};pawns++;}else if(p.t==='k'){if(p.c==='w')wk={r,c};else bk={r,c};}else others++;}if(pawns!==1||!wk||!bk||others>0)return null;const pc=pawn.col,pr=pawn.r,prc=pawn.c;let rA,rB,pm;if(pc==='w'){const rk=8-pr;pm=(rk===2)?5:(8-rk);rA=0;rB=pm;}else{const rk=8-pr;pm=(rk===7)?5:(rk-1);rB=7;rA=7-pm;}const dk=pc==='w'?bk:wk;const cd=dk.c>=prc?1:-1;let cA=prc,cB=prc+cd*pm;if(cB<cA){const t=cA;cA=cB;cB=t;}cA=Math.max(0,cA);cB=Math.min(7,cB);const cells=new Set();for(let r=Math.max(0,rA);r<=Math.min(7,rB);r++)for(let c=cA;c<=cB;c++)cells.add(r+'-'+c);const dc2=pc==='w'?'b':'w',dtm=boardGame.turn===dc2;const inb=cells.has(dk.r+'-'+dk.c);let cs=false;if(dtm&&!inb){for(let q=-1;q<=1;q++)for(let w=-1;w<=1;w++)if(cells.has((dk.r+q)+'-'+(dk.c+w)))cs=true;}return{cells,catches:inb||cs,defToMove:dtm};})();
  const rankLabels=flip?['1','2','3','4','5','6','7','8']:['8','7','6','5','4','3','2','1'];
  const fileLabels=flip?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h'];

  const turnTxt=playEnd?(playEnd.reason==='time'?`${playEnd.winner==='w'?'White':'Black'} wins on time`:`${opp(playEnd.winner)==='w'?'White':'Black'} resigned — ${playEnd.winner==='w'?'White':'Black'} wins`):isOver?(status==='checkmate'?`Checkmate — ${boardGame.turn==='w'?'Black':'White'} wins!`:'Stalemate — draw'):status==='check'?`${boardGame.turn==='w'?'White':'Black'} in check`:`${boardGame.turn==='w'?'White':'Black'} to move`;
  const _winSide=playEnd?playEnd.winner:(status==='checkmate'?(boardGame.turn==='w'?'b':'w'):null);
  const _winTxt=_winSide==null?'Draw':((mode==='play'&&opponent==='computer')?(_winSide===pColor?'You win! 🎉':'You lose'):(_winSide==='w'?'White wins':'Black wins'));
  const gameResult=(isOver||playEnd)?{head:(playEnd?(playEnd.reason==='time'?'Time!':'Resigned'):(status==='checkmate'?'Checkmate!':'Stalemate')),sub:_winTxt}:null;
  const evalFallback=inReview?(ply>0?review.analysis[ply-1].evalAfter:0):((mode==='play'&&opponent==='computer')?evalPawns(game):0);
  const dispFen=toFEN(boardGame);
  const sfHit=(sfEval&&sfEval.fen===dispFen)?sfEval:null;
  const evalNow=sfHit?(sfHit.mate!=null?(sfHit.mate>0?10:-10):sfHit.cp/100):evalFallback;
  const evalTxt=sfHit?(sfHit.mate!=null?((sfHit.mate>0?'M':'-M')+Math.abs(sfHit.mate)):((sfHit.cp>0?'+':'')+(sfHit.cp/100).toFixed(1))):((evalFallback>0?'+':'')+Math.max(-9.9,Math.min(9.9,evalFallback)).toFixed(1));
  // Live eval bar — full-strength Stockfish on the displayed position (separate from the strength-limited opponent search).
  useEffect(()=>{
    const showEval=inReview?(ply>0):(mode==='play'&&opponent==='computer');
    if(!showEval)return;
    const w=sfRef.current; if(!w||!sfReady)return;
    if(!inReview&&mode==='play'&&opponent==='computer'&&game.turn!==pColor)return; // opponent is thinking on the single worker
    sfEvalFenRef.current=dispFen; sfEvalingRef.current=true;
    try{ w.postMessage('setoption name UCI_LimitStrength value false'); w.postMessage('setoption name MultiPV value 1'); w.postMessage('position fen '+dispFen); w.postMessage('go depth 12'); }catch(e){}
    return()=>{try{w.postMessage('stop');}catch(e){}};
  },[dispFen,inReview,ply,mode,opponent,sfReady,pColor,game.turn]);

  const SHADOW_BTN=boardDepth?'0 4px 0 rgba(0,0,0,.45),0 7px 14px rgba(0,0,0,.36),inset 0 1.5px 0 rgba(255,255,255,.30),inset 0 -3px 6px rgba(0,0,0,.22)':'0 3px 0 rgba(0,0,0,.40),0 5px 11px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.22)';
  const SHADOW_BOX=boardDepth?'0 3px 0 rgba(0,0,0,.28),0 9px 22px rgba(0,0,0,.34),inset 0 1.5px 0 rgba(255,255,255,.16),inset 0 -4px 10px rgba(0,0,0,.24)':'0 2px 0 rgba(0,0,0,.20),0 6px 15px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.08)';
  const SHADOW_CARD='0 4px 0 rgba(0,0,0,.32),0 14px 30px rgba(0,0,0,.48),inset 0 2px 0 rgba(255,255,255,.14)';
  const btn=(bg,bd,col)=>({padding:'9px 15px',borderRadius:12,cursor:'pointer',fontSize:'clamp(12px,2.7vw,14px)',fontWeight:700,background:bg,backgroundImage:'linear-gradient(rgba(255,255,255,.20),rgba(255,255,255,.04) 48%,rgba(0,0,0,.10))',border:bd,color:col,letterSpacing:.3,fontFamily:"'Segoe UI',system-ui,sans-serif",display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,minHeight:44,whiteSpace:'nowrap',boxShadow:boardDepth?'0 4px 0 rgba(0,0,0,.38),0 9px 18px rgba(0,0,0,.36),inset 0 1.5px 0 rgba(255,255,255,.34),inset 0 -4px 8px rgba(0,0,0,.22)':'0 3px 0 rgba(0,0,0,.34),0 7px 16px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.30),inset 0 -3px 6px rgba(0,0,0,.16)'});
  // Primary/secondary navigation buttons: equal width, larger text, stronger tactile depth, consistent palette.
  const navBtn=(primary)=>({flex:1,textAlign:'center',padding:'14px 16px',borderRadius:13,cursor:'pointer',fontSize:'clamp(13px,3.2vw,16px)',fontWeight:800,minHeight:52,letterSpacing:.3,fontFamily:"'Segoe UI',system-ui,sans-serif",display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7,whiteSpace:'nowrap',color:primary?'#191919':'#fff',background:primary?'var(--ac)':'rgba(255,255,255,.10)',backgroundImage:'linear-gradient(rgba(255,255,255,.22),rgba(255,255,255,.05) 48%,rgba(0,0,0,.12))',border:primary?'none':'1px solid rgba(255,255,255,.22)',boxShadow:primary?'0 5px 0 rgba(0,0,0,.30),0 11px 22px rgba(var(--acr),.32),inset 0 1px 0 rgba(255,255,255,.42),inset 0 -3px 7px rgba(0,0,0,.18)':'0 5px 0 rgba(0,0,0,.42),0 11px 22px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.30),inset 0 -3px 7px rgba(0,0,0,.20)'});
  const pill=(on)=>({padding:'6px 12px',borderRadius:20,cursor:'pointer',fontSize:'clamp(9px,2vw,11px)',fontWeight:600,border:on?'1.5px solid var(--ac)':'1.5px solid rgba(255,255,255,.18)',background:on?'rgba(var(--acr),.25)':'transparent',color:on?'var(--ac2)':'rgba(255,255,255,.55)'});
  const cats=[...new Set(LIB.map(o=>o.cat))];
  const groupOf=(cat)=>/gambit/i.test(cat)?'gambits':/endgame/i.test(cat)?'endgames':'openings';
  const GPAY={"Légal Trap":'mate',"Scholar's Mate":'mate',"Stafford Gambit: Mating Trap":'mate',"Budapest Gambit: Kieninger Trap":'mate',"Fishing Pole Trap":'mate',"Tennison Gambit":'win',"Blackburne Shilling Gambit":'win',"Albin Counter-Gambit: Lasker Trap":'win',"Englund Gambit: Rosen Trap":'win'};
  const payoffOf=(op)=>GPAY[op.name]||'edge';
  const firstWhiteMove=(pgn)=>{if(!pgn)return null;const t=String(pgn).replace(/\{[^}]*\}/g,' ').replace(/\[[^\]]*\]/g,' ');const m=t.match(/(?:^|\s)1\.+\s*([a-hKQRBNOx0-8+#=!?-]+)/);return m?m[1]:null;};
  const fkOf=(s)=>!s?'other':(s.indexOf('e4')===0?'e4':(s.indexOf('d4')===0?'d4':'other'));

  const showBoard=mode==='play'||(mode==='puzzle'&&(pzView==='browse'||(pzView==='online'&&!!(curPuz&&curPuz.ext))))||(mode==='learn'&&openIdx!==null)||inReview;
  const railed=wide&&showBoard;   // only use the board+rails layout when a board is actually shown
  diagRef.current={build:BUILD_INFO,mode,screen:homeScreen?'home':(playSetup?'play-setup':mode),openIdx,opp:opponent,phase:learnPhase,vw,vh:vp.h,dpr:(typeof window!=='undefined'?window.devicePixelRatio:1),wide,railed,boardPx,SQ};
  const hb=vp.w>=720;             // tablet-sized screen: scale the Home screen up to use the real estate
  const hLand=vp.w>vp.h&&vp.w>=720;   // landscape Home on a roomy screen: tiles in one row, compact intro
  const hbig=hb&&!hLand;              // tablet PORTRAIT Home: scale up (landscape stays compact to fit the short height)
  const outerRowStyle=railed?{display:'flex',flexDirection:'row',alignItems:'flex-start',justifyContent:'flex-start',gap:14,width:'100%'}:{display:'contents'};
  const sideColStyle=railed?{display:'flex',flexDirection:'column',alignItems:'stretch',justifyContent:'flex-start',gap:8,width:sideW,height:boardPx,paddingTop:42,overflowY:'auto',overflowX:'hidden'}:{display:'contents'};
  const learnPlansBox=(mode==='learn'&&openIdx!==null&&learnPlans)?(<div style={{width:'100%',background:'linear-gradient(150deg,rgba(var(--acr),.18),rgba(var(--acr),.06))',border:'1px solid rgba(var(--acr),.42)',borderRadius:12,padding:'11px 13px',boxShadow:SHADOW_BOX}}>
<div style={{fontSize:'clamp(11px,2.5vw,13px)',fontWeight:800,color:'var(--ac2)',marginBottom:4}}>🎯 What we're trying to do</div><div style={{fontSize:'clamp(11px,2.5vw,13.5px)',color:'rgba(255,255,255,.9)',lineHeight:1.55}}>{learnPlans}</div></div>):null;
  const learnVideoBox=(mode==='learn'&&openIdx!==null)?(<div style={{width:'100%',background:'linear-gradient(150deg,rgba(255,255,255,.08),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.16)',borderRadius:12,padding:'11px 13px',boxShadow:SHADOW_BOX}}><div onClick={()=>setVideoOpen(o=>!o)} style={{fontSize:'clamp(11px,2.5vw,13px)',fontWeight:700,color:'#e0b34d',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>📺 Watch it explained<span style={{fontSize:13,opacity:.85}}>{videoOpen?'▾':'▸'}</span></div>{videoOpen&&(<>{learnVideo&&(<><div style={{fontSize:'clamp(9px,2.1vw,11.5px)',color:'rgba(255,255,255,.7)',margin:'2px 0 8px',lineHeight:1.45}}>{learnVideo.title} · {learnVideo.author} ({learnVideo.length})</div><div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}><button onClick={()=>setShowVideo(s=>!s)} style={btn('var(--ac)','none','#fff')}>{showVideo?'Hide player':'▶ Watch in app'}</button><a href={`https://youtu.be/${learnVideo.id}`} target="_blank" rel="noopener noreferrer" style={{fontSize:'clamp(9px,2.1vw,11.5px)',color:'var(--ac2)',textDecoration:'underline'}}>open on YouTube ↗</a></div>{showVideo&&(<div style={{marginTop:8,position:'relative',width:'100%',paddingTop:'56.25%',borderRadius:8,overflow:'hidden',background:'#000'}}><iframe src={`https://www.youtube-nocookie.com/embed/${learnVideo.id}`} title={learnVideo.title} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:0}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div>)}{showVideo&&<div style={{fontSize:'clamp(8px,2vw,10.5px)',color:'rgba(255,255,255,.58)',marginTop:5,lineHeight:1.4}}>If the player stays blank in this preview, tap “open on YouTube” — the embedded player works once the app is deployed to a real site.</div>}</>)}<div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.6)',margin:`${learnVideo?9:4}px 0 6px`,lineHeight:1.4}}>{learnVideo?'More on this opening from top coaches:':'Find this opening explained by top coaches:'}</div><div style={{display:'flex',gap:7,flexWrap:'wrap'}}>{['Remote Chess Academy','GothamChess','Chess Vibes'].map(ch=>(<a key={ch} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(LIB[openIdx].name+' '+ch)}`} target="_blank" rel="noopener noreferrer" style={{padding:'5px 10px',borderRadius:7,background:'rgba(var(--acr),.14)',border:'1px solid rgba(var(--acr),.32)',color:'var(--ac2)',fontSize:'clamp(9px,2vw,11px)',fontWeight:600,textDecoration:'none',whiteSpace:'nowrap'}}>▶ {ch}</a>))}</div></>)}</div>):null;
  const pzLow=mode==='puzzle'&&(pzView==='browse'||pzView==='online');  // board sits below the goal/message text
  useEffect(()=>{try{localStorage.setItem('ct_feedback',JSON.stringify(fbMap));}catch{}},[fbMap]);
  const sendLessonFb=(name,v)=>setFbMap(m=>({...m,[name]:v}));
  const fbCtx=()=>{const d=diagRef.current||{};const op=(d.openIdx!=null&&LIB[d.openIdx])?LIB[d.openIdx].name:null;let parts=['build='+((BUILD_INFO||'?').split(' ')[0]),'screen='+(d.screen||d.mode||'?')];if(op)parts.push('lesson='+op);if(d.mode==='learn'){if(d.phase)parts.push('phase='+d.phase);parts.push('step='+openStepRef.current);}try{const h=(boardGame&&boardGame.history)||[];if(h.length)parts.push('moves='+h.map(x=>x.san).join(' '));}catch(e){}return parts.join(' · ');};
   const sendFbNote=()=>{const t=String(fbText||'').trim();if(!t){setFbOpen(false);return;}const ctx=fbCtx();const block='[Chess Trainer feedback]\n'+ctx+'\nnote: '+t;let ok=false;try{navigator.clipboard.writeText(block);ok=true;}catch(e){}if(!ok){try{const ta=document.createElement('textarea');ta.value=block;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');document.body.removeChild(ta);ok=true;}catch(_){}}try{const arr=JSON.parse(localStorage.getItem('ct_feedback_notes')||'[]');arr.push({t,ctx,ts:Date.now()});localStorage.setItem('ct_feedback_notes',JSON.stringify(arr.slice(-50)));}catch(e){}try{postReport('feedback',{ctx,note:t,ts:Date.now()});}catch(_){}setFbCopied(ok);setFbSent(true);setFbText('');};
  const _lessonNm=(mode==='learn'&&openIdx!==null&&LIB[openIdx])?LIB[openIdx].name:null;
  const _coachRec=useMemo(()=>{const lvl=cpuElo<1000?'endgames':(cpuElo<1500?'openings':'gambits');const pool=LIB.map((o,i)=>({o,i})).filter(x=>groupOf(x.o.cat)===lvl);const list=pool.length?pool:LIB.map((o,i)=>({o,i}));if(!list.length)return null;const seed=Math.floor(Date.now()/86400000);const pick=list[seed%list.length];const msg=cpuElo<1000?'New to chess? Lock in the endgame basics':(cpuElo<1500?'Build a solid opening you can trust':'Ready for sharp play? Learn to attack');return {idx:pick.i,name:pick.o.name,msg};},[cpuElo]);
  const coachNudge=()=>{const pTot=pzTotalSolved(pzSolvedMap)+pzOSolved;const gReviewed=Object.keys(gameStatsRef.current||{}).length;const dTd=(daily&&daily.date===dstr(new Date()))?(daily.count||0):0;
    if(gReviewed===0)return{tip:"Import one of your games and I'll show you exactly where it turned.",goLabel:'Review',go:()=>{setCoachOpen(false);setHomeScreen(false);setMode('analyze');}};
    if(pTot===0)return{tip:"Warm up with a quick tactics puzzle. They sharpen your eye fast.",goLabel:'Solve puzzles',go:()=>{setCoachOpen(false);setMistakeMode(false);setHomeScreen(false);setMode('puzzle');setOpenIdx(null);setPzView('roadmap');}};
    if(dTd<DAILY_GOAL)return{tip:"You're "+dTd+" of "+DAILY_GOAL+" on today's puzzle goal. A few more?",goLabel:'Solve puzzles',go:()=>{setCoachOpen(false);setMistakeMode(false);setHomeScreen(false);setMode('puzzle');setOpenIdx(null);setPzView('roadmap');}};
    const tips=[["Explore a new opening over in Discover.",'Discover',()=>{setCoachOpen(false);setHomeScreen(false);setMode('learn');setOpenIdx(null);setLearnGroup(null);}],["Review your latest game and hunt the turning point.",'Review',()=>{setCoachOpen(false);setHomeScreen(false);setMode('analyze');}],["Daily goal done, nice. Try the next puzzle tier.",'Solve puzzles',()=>{setCoachOpen(false);setMistakeMode(false);setHomeScreen(false);setMode('puzzle');setOpenIdx(null);setPzView('roadmap');}]];const pk=tips[new Date().getDate()%tips.length];return{tip:pk[0],goLabel:pk[1],go:pk[2]};
  };
  const coachRun=(idx)=>{const op=LIB[idx];if(!op)return;setCoachOpen(false);setHomeScreen(false);selectOpening(idx);
    let line=op.line,label=op.name;
    if(lineDays(op.name).length>=1){const v=(op.vars||[]).find(vv=>lineDays(op.name+'§'+vv.name).length<1);if(v){pickVariation(v);line=v.line;label=op.name+' → '+v.name;}}
    setShowHint(false);setRevealHint(false);showHintRef.current=false;startPractice(line,label);};
  const coachPlan=()=>{
    const goPz=()=>{setCoachOpen(false);setMistakeMode(false);setHomeScreen(false);setMode('puzzle');setOpenIdx(null);setPzView('roadmap');};
    const goRev=()=>{setCoachOpen(false);setHomeScreen(false);setMode('analyze');};
    const goTrain=()=>{setCoachOpen(false);setHomeScreen(false);setMode('learn');setOpenIdx(null);setLearnGroup('train');};
    const goDisc=()=>{setCoachOpen(false);setHomeScreen(false);setMode('learn');setOpenIdx(null);setLearnGroup(null);};
    const pTot=pzTotalSolved(pzSolvedMap)+pzOSolved;
    const gReviewed=Object.keys(gameStatsRef.current||{}).length;
    const dTd=(daily&&daily.date===dstr(new Date()))?(daily.count||0):0;
    const learnedN=Object.values(trainMastery).filter(m=>m&&m.learned).length;
    const dueN=Object.values(trainMastery).filter(m=>m&&m.learned&&Date.now()>(m.due||0)).length;
    const mineN=(myMistakesRef.current||[]).length;
    const plan=[];
    if(gReviewed===0)plan.push({ic:'📥',text:"Import one of your games so I can show you where it turned.",goLabel:'Review',go:goRev});
    if(dTd<DAILY_GOAL)plan.push({ic:'🧩',text:'Solve '+(DAILY_GOAL-dTd)+' more puzzle'+((DAILY_GOAL-dTd)>1?'s':'')+" to finish today's goal.",goLabel:'Solve',go:goPz});
    if(mineN>0)plan.push({ic:'🔎',text:'Practice '+mineN+' position'+(mineN>1?'s':'')+' you slipped on in your games.',goLabel:'Practice',go:()=>{setCoachOpen(false);startMistakes();}});
    if(dueN>0)plan.push({ic:'🎯',text:'Review '+dueN+' opening'+(dueN>1?'s':'')+' that are due today.',goLabel:'Train',go:goTrain});
    if(learnedN===0)plan.push({ic:'📚',text:'Learn your first opening, move by move.',goLabel:'Learn',go:goTrain});
    if(plan.length<3){const fill=[{ic:'🔭',text:'Explore a new opening over in Discover.',goLabel:'Discover',go:goDisc},{ic:'📊',text:'Review your latest game and hunt the turning point.',goLabel:'Review',go:goRev},{ic:'🧗',text:'Push into the next puzzle tier.',goLabel:'Solve',go:goPz}];for(const f of fill){if(plan.length>=3)break;if(!plan.some(p=>p.goLabel===f.goLabel))plan.push(f);}}
    return plan.slice(0,3);
  };
  const achvStats=()=>({pz:pzTotalSolved(pzSolvedMap)+pzOSolved,streak:(daily&&daily.streak)||0,bestStreak:pzBest||0,learned:Object.values(trainMastery).filter(m=>m&&m.learned).length,reviewed:Object.keys(gameStatsRef.current||{}).length,bril:(myBrilliant||[]).length});
  useEffect(()=>{const s=achvStats();const got=ACHV.filter(a=>{try{return a.test(s);}catch(e){return false;}}).map(a=>a.id);setAchv(prev=>{const set=new Set(prev||[]);let ch=false;got.forEach(id=>{if(!set.has(id)){set.add(id);ch=true;}});return ch?[...set]:prev;});},[pzSolvedMap,pzOSolved,daily,pzBest,trainMastery,gsVer,myBrilliant]);
  useEffect(()=>{try{localStorage.setItem('ct_achv',JSON.stringify(achv));}catch(e){}},[achv]);
  const realOpeningStats=useMemo(()=>{
    if(!ccGames||!ccGames.length)return null;
    const byBucket={},byOpening={};let n=0;
    for(const g of ccGames){
      const info=gameInfo(g);if(!info.userColor||!info.code)continue;
      const sans=pgnSans(g.pgn,14);if(!sans.length)continue;
      const fk=fkOf(sans[0]);const bk=info.userColor+'|'+fk;
      const rb=byBucket[bk]||(byBucket[bk]={games:0,win:0,draw:0});rb.games++;if(info.code==='win')rb.win++;else if(info.code==='draw')rb.draw++;
      const nm=nameOpening(sans);if(nm){const base=nm.name.split(' — ')[0];const ro=byOpening[base]||(byOpening[base]={name:base,games:0,win:0,draw:0});ro.games++;if(info.code==='win')ro.win++;else if(info.code==='draw')ro.draw++;}
      n++;
    }
    const openings=Object.values(byOpening).map(o=>({name:o.name,games:o.games,score:(o.win+0.5*o.draw)/o.games})).sort((a,b)=>b.games-a.games);
    return {byBucket,openings,n};
  },[ccGames]);
  const learnFeedbackBox=_lessonNm?(<div style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'8px 12px',borderRadius:11,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)'}}>{fbMap[_lessonNm]?(<span style={{fontSize:'clamp(10px,2.3vw,12px)',color:'var(--ac2)',fontWeight:700}}>🙏 Thanks for the feedback!</span>):(<><span style={{fontSize:'clamp(10px,2.3vw,12px)',color:'rgba(255,255,255,.62)'}}>Was this lesson helpful?</span><button onClick={()=>sendLessonFb(_lessonNm,'up')} title="Helpful" style={{fontSize:18,lineHeight:1,padding:'4px 9px',borderRadius:12,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.18)',cursor:'pointer'}}>👍</button><button onClick={()=>sendLessonFb(_lessonNm,'down')} title="Not helpful" style={{fontSize:18,lineHeight:1,padding:'4px 9px',borderRadius:12,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.18)',cursor:'pointer'}}>👎</button></>)}</div>):null;
  // Enter the solving board for a given puzzle index, optionally tagged to a roadmap tier
  const pzEnterBrowse=(idx,tier)=>{setPzTrainTier(tier);loadPuzzle(idx);setPzView('browse');};
  // ── Lichess online puzzles ──
  const onlineSolved=(p)=>{const ids=pzOSolvedIdsRef.current,already=!!ids[p.id];const nids=already?ids:{...ids,[p.id]:1};const nstreak=pzStreakRef.current+1,nbest=Math.max(pzBestRef.current,nstreak),nxp=pzXPRef.current+(already?3:Math.max(8,Math.round((p.rating||1200)/10))),nc=already?pzOSolvedRef.current:pzOSolvedRef.current+1;setPzOSolvedIds(nids);setPzStreak(nstreak);setPzBest(nbest);setPzXP(nxp);setPzOSolved(nc);PZSTORE.set(PZKEY,JSON.stringify({solved:pzSolvedRef.current,streak:nstreak,best:nbest,xp:nxp,online:nc,onlineIds:nids}));bumpDaily();};
  const loadExternal=(obj)=>{if(!obj){setPzOErr('That puzzle could not be read.');return false;}setGame(obj.pos);setLastMv(obj.last||null);setFlip(obj.pos.turn==='b');setPuzStep(0);setPuzMsg('');setPuzSolved(false);setPuzReveal(false);setPuzSide(obj.pos.turn);setCurPuz(obj);UI.current={sel:null,tgts:[],drag:null,dragging:false};setPzView('online');repaint();return true;};
  const loadDaily=async()=>{setPzOErr('');setPzOInfo('');setPzOLoading(true);try{const r=await fetch('https://lichess.org/api/puzzle/daily');const j=await r.json();const o=lichessFromApi(j);if(!o)throw 0;setPzPack(null);setPzOInfo('📅 Daily · '+o.motif+(o.rating?(' · rating '+o.rating):''));loadExternal(o);}catch(e){setPzOErr("Couldn't reach Lichess. This works on the deployed site with internet — it may be blocked in this in-app preview.");}setPzOLoading(false);};
  const loadById=async(id)=>{const c=String(id||'').trim().replace(/[^A-Za-z0-9]/g,'');if(!c){setPzOErr('Enter a puzzle ID (the code from lichess.org/training/XXXXX).');return;}setPzOErr('');setPzOInfo('');setPzOLoading(true);try{const r=await fetch('https://lichess.org/api/puzzle/'+c);const j=await r.json();const o=lichessFromApi(j);if(!o)throw 0;setPzPack(null);setPzOInfo('🎲 '+c+' · '+o.motif+(o.rating?(' · rating '+o.rating):''));loadExternal(o);}catch(e){setPzOErr("Couldn't load puzzle '"+c+"'. Check the ID — or it may be blocked in this preview.");}setPzOLoading(false);};
  const _packBand=row=>{const r=row.rating||row.r||0;const d=pzDiffRef.current;if(d==='easy')return r<1300;if(d==='med')return r>=1300&&r<1700;if(d==='hard')return r>=1700;return true;};
  const showPackIdx=(rows,i)=>{if(!rows||!rows.length){setPzOErr('That pack is empty.');return;}const solved=pzOSolvedIdsRef.current;for(let k=0;k<rows.length;k++){const idx=(((i+k)%rows.length)+rows.length)%rows.length;const row=rows[idx];if(!_packBand(row))continue;const rid='lichess:'+(row.id||row.i||'');if(row.id&&solved[rid])continue;const o=lichessFromPack(row);if(o){setPzPackIdx(idx);setPzOErr('');setPzOInfo('📦 '+(idx+1)+'/'+rows.length+' · '+o.motif+(o.rating?(' · rating '+o.rating):''));loadExternal(o);return;}}const d=pzDiffRef.current,lbl=d==='easy'?'easier ':d==='med'?'medium ':d==='hard'?'harder ':'';setPzOErr('No unsolved '+lbl+'puzzles left in this pack — switch difficulty or load another pack.');};
  const loadPack=async(url)=>{const u=String(url||'').trim();if(!u){setPzOErr('Paste a URL to a puzzle pack (.json).');return;}setPzOErr('');setPzOInfo('');setPzOLoading(true);try{const r=await fetch(u);const arr=await r.json();const rows=Array.isArray(arr)?arr:(arr.puzzles||[]);if(!rows.length)throw 0;setPzPack(rows);showPackIdx(rows,0);}catch(e){setPzOErr("Couldn't load that pack. The URL must return a JSON array of puzzles.");}setPzOLoading(false);};
  const nextOnline=()=>{if(mistakeMode)return nextMistake();if(pzPack&&pzPack.length)showPackIdx(pzPack,pzPackIdx+1);else loadDaily();};
  const puzzleFromMistake=(m)=>{if(!m)return null;try{const g=fromFEN(m.fen);
    // Guard against stale/illegal saved data: the position must be legal (the side NOT to move cannot be in check) and the saved solution must be a legal move.
    if(!g||!g.board||!findKing(g.board,'w')||!findKing(g.board,'b')||isInCheck(g.board,opp(g.turn))||!uciToMove(g,m.uci))return null;
    const o=_lichessObj(g,[m.uci],0,null,['mix'],'mine:'+m.fen);if(!o)return null;const side=g.turn==='w'?'White':'Black';const isB=m.label==='Brilliant';o.goal=isB?(side+' to move — you found a brilliant move here. Can you spot it again?'):(side+' to move — you played '+(m.played?(m.played+' '):'')+'here, a '+String(m.label||'mistake').toLowerCase()+'. Find the stronger move.');o.hint=isB?'You played something special here — a sacrifice or a precise blow.':'There was a better move than the one you chose. Look for the most forcing or solid option.';o.explain=isB?"That's your brilliant move. Nicely done.":"That's the move you missed — well spotted.";o.url=null;o.mine=true;o.last=m.last||null;return o;}catch(e){return null;}};
  const startMistakes=()=>{const qs=(myMistakesRef.current||[]).slice();if(!qs.length)return;drillKindRef.current='mistake';mistakeQueueRef.current=qs;let i=0,o=null;while(i<qs.length){o=puzzleFromMistake(qs[i]);if(o)break;i++;}if(!o)return;mistakeIdxRef.current=i;setMistakeMode(true);setHomeScreen(false);setMode('puzzle');loadExternal(o);};
  const startBrilliant=()=>{const qs=(myBrilliantRef.current||[]).slice();if(!qs.length)return;drillKindRef.current='brilliant';mistakeQueueRef.current=qs;let i=0,o=null;while(i<qs.length){o=puzzleFromMistake(qs[i]);if(o)break;i++;}if(!o)return;mistakeIdxRef.current=i;setMistakeMode(true);setHomeScreen(false);setMode('puzzle');loadExternal(o);};
  const nextMistake=()=>{const q=mistakeQueueRef.current||[];let n=mistakeIdxRef.current+1;while(n<q.length){const o=puzzleFromMistake(q[n]);if(o){mistakeIdxRef.current=n;loadExternal(o);return;}n++;}exitMistakes();};
  const exitMistakes=()=>{setMistakeMode(false);setCurPuz(null);setPzView('roadmap');setMode('analyze');};
  useEffect(()=>{if(mistakeMode&&puzSolved&&drillKindRef.current==='mistake'){const q=mistakeQueueRef.current||[];const cur=q[mistakeIdxRef.current];if(cur)setMyMistakes(prev=>prev.filter(x=>x.fen!==cur.fen));}},[puzSolved,mistakeMode]);
  const curAnno=inReview&&ply>0?review.analysis[ply-1]:null;
  useEffect(()=>{ if(inReview&&ply>0&&review&&review.analysis[ply-1]&&review.analysis[ply-1].cls&&review.analysis[ply-1].cls.label==='Brilliant')playBrilliantChime(); },[inReview,ply,review]);
  useEffect(()=>{ if(!revAuto||!inReview||!review)return; if(ply>=review.plies.length){const t=setTimeout(()=>setRevAuto(false),1900);return ()=>clearTimeout(t);} const t=setTimeout(()=>{const np=ply+1;const san=(review.plies[np-1]&&review.plies[np-1].san)||'';try{playSfx(/x/.test(san)?'capture':(/[+#]/.test(san)?'check':'move'));}catch(e){} setPly(np);},1250); return ()=>clearTimeout(t); },[revAuto,inReview,ply,review]);
  const _annoWhy=(()=>{if(!curAnno||!inReview)return null;const ai=ply-1,a=curAnno,L=a.cls&&a.cls.label;if(!L)return null;const moverSign=(ai%2===0)?1:-1,mover=(ai%2===0)?'White':'Black';const ev=(typeof a.evalAfter==='number')?a.evalAfter:0,evM=ev*moverSign,lossP=(a.loss||0)/100;let matNote='';const b0=review.positions[ai]&&review.positions[ai].board,b2=review.positions[ai+2]&&review.positions[ai+2].board;if(b0&&b2){const d=(materialDiff(b2)-materialDiff(b0))*moverSign;if(d<=-2)matNote=' Your opponent won material as a result.';else if(d>=2&&L==='Brilliant')matNote=' And the material came back with interest.';}
    if(L==='Great')return '⭐ A great move — the best move here, and clearly stronger than any alternative.';
    if(L==='Miss')return 'A miss — you were clearly better, but this let a big part of the advantage slip.'+matNote;
    if(L==='Brilliant')return '🔆 A brilliant move — a strong, hard-to-spot idea, often a sacrifice or the only move that keeps the win.'+matNote+(Math.abs(evM)>=1.5?(' The engine has '+mover.toLowerCase()+' clearly on top here.'):'');
    if(L==='Blunder'||L==='Mistake')return 'This '+L.toLowerCase()+' gave away about '+lossP.toFixed(1)+' '+(lossP<1.4?'pawn':'pawns')+' of advantage.'+matNote+(evM<=-1.5?(' '+mover+' is now worse.'):(evM>=1.5?(' '+mover+' is still better, just by less.'):' The game is roughly level now.'));
    if(L==='Inaccuracy')return 'A small inaccuracy — about '+lossP.toFixed(1)+' pawns short of the best move.';
    if(L==='Best')return '✓ The best move here — exactly what the engine plays in this position.'+(Math.abs(evM)>=1.5?(' '+mover+' is clearly on top.'):(Math.abs(evM)<0.5?' The position stays balanced.':''));
    if(L==='Excellent')return '✓ An excellent move, right among the top engine choices.';
    if(L==='Good')return 'A solid, sensible move that keeps your position healthy.';
    return null;})();

  return(
    <div ref={rootRef} style={{'--ac':TH.accent,'--ac2':TH.accent2,'--acr':TH.rgb,'--ok':'#3ecf7a','--gold':'#f0c24d','--warn':'#e0a83a','--bad':'#e85d4a','--r':'12px','--head':headFont,'--pcfilter':SK.pcf||'none',minHeight:'100dvh',width:'100%',maxWidth:'100vw',overflowX:'hidden',background:baseBg,backgroundImage:appBgImg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:railed?'center':'flex-start',paddingTop:wide?'calc(env(safe-area-inset-top,0px) + 6px)':'calc(env(safe-area-inset-top,0px) + 8px)',paddingLeft:'calc(env(safe-area-inset-left,0px) + 3px)',paddingRight:'calc(env(safe-area-inset-right,0px) + 3px)',paddingBottom:wide?6:8,fontFamily:"'Segoe UI',system-ui,sans-serif",userSelect:'none',WebkitUserSelect:'none',color:'#fff',transition:'background .3s'}}>
      {tourOpen&&(()=>{
        const FMT={roundrobin:{label:'Round robin',tc:{init:300,inc:3},blurb:'Everyone plays everyone'},knockout:{label:'Knockout',tc:{init:600,inc:5},blurb:'Single elimination bracket'},swiss:{label:'Swiss',tc:{init:300,inc:0},blurb:'Paired by score, fixed rounds'}};
        const me=cloudUser?{uid:cloudUser.uid,name:cloudUser.name||'Player',photo:cloudUser.photo||''}:null;
        const clk=(tc)=>tc?((tc.init/60)+'+'+tc.inc):'';
        const whenTxt=(ms)=>{if(!ms)return '';const d=new Date(ms);return d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});};
        const joined=(t)=>!!(me&&t.players&&t.players.some(p=>p&&p.uid===me.uid));
        const card={background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.14)',borderRadius:14,padding:'13px 15px'};
        const doCreate=async()=>{const C=window.CTCloud;if(!C||!me)return;const nm=tourName.trim();if(!nm){setTourMsg('Give it a name.');return;}const startAt=tourWhen?new Date(tourWhen).getTime():(Date.now()+3600000);if(isNaN(startAt)||startAt<Date.now()-60000){setTourMsg('Pick a future start time.');return;}setTourBusy(true);setTourMsg('');try{const f=FMT[tourFmt];await C.tourCreate({name:nm,format:tourFmt,tc:f.tc,startAt:startAt,players:[me]});setTourName('');setTourWhen('');setTourView('list');}catch(e){const m=String((e&&e.message)||e);setTourMsg(m.indexOf('permission')>=0||m.indexOf('insufficient')>=0?'Cloud rule not published yet — publish the /tournaments rule.':'Could not create. Try again.');}setTourBusy(false);};
        const doJoin=async(t)=>{const C=window.CTCloud;if(!C||!me)return;setTourMsg('');try{await C.tourJoin(t.id,me);}catch(e){setTourMsg('Could not join.');}};
        const sel=tourSel?tours.find(x=>x.id===tourSel):null;
        const _rr=(ids)=>{let a=ids.slice();if(a.length%2)a.push(null);const n=a.length;const rounds=[];let arr=a.slice();for(let r=0;r<n-1;r++){const pairs=[];for(let i=0;i<n/2;i++){const p1=arr[i],p2=arr[n-1-i];if(p1!=null&&p2!=null)pairs.push([p1,p2]);}rounds.push(pairs);const rest=arr.slice(1);rest.unshift(rest.pop());arr=[arr[0]].concat(rest);}return rounds;};
        const _ko=(ids)=>{let size=1;while(size<ids.length)size*=2;const a=ids.slice();while(a.length<size)a.push(null);const r=[];for(let i=0;i<size/2;i++)r.push([a[i],a[size-1-i]]);return r;};
        const _sw=(ids)=>{const h=Math.ceil(ids.length/2);const top=ids.slice(0,h),bot=ids.slice(h);const r=[];for(let i=0;i<h;i++)r.push([top[i],i<bot.length?bot[i]:null]);return r;};
        const nameOf=(uid)=>{if(!uid)return 'Bye';const p=((sel&&sel.players)||[]).find(x=>x&&x.uid===uid);return p?(p.name||'Player'):'?';};
        const doStart=async()=>{const C=window.CTCloud;if(!C||!sel)return;const ids=((sel.players)||[]).map(p=>p.uid);if(ids.length<2){setTourMsg('Need at least 2 players to start.');return;}let schedule;if(sel.format==='roundrobin')schedule=_rr(ids);else if(sel.format==='knockout')schedule=[_ko(ids)];else schedule=[_sw(ids)];setTourMsg('');try{await C.tourUpdate(sel.id,{status:'live',schedule:schedule,startedAt:Date.now()});}catch(e){setTourMsg('Could not start.');}};
        return(<div style={{position:'fixed',inset:0,zIndex:9991,background:'rgba(10,12,18,.97)',display:'flex',flexDirection:'column',padding:'calc(env(safe-area-inset-top,0px) + 14px) 16px 16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:19,fontWeight:800,color:'#fff'}}>🏆 Tournaments</div>
            <button onClick={()=>{setTourOpen(false);}} style={{width:34,height:34,borderRadius:10,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.06)',color:'#fff',fontSize:16,cursor:'pointer'}}>✕</button>
          </div>
          {tourMsg&&<div style={{background:'rgba(224,168,58,.16)',border:'1px solid rgba(224,168,58,.4)',color:'#f0c24d',borderRadius:10,padding:'9px 12px',fontSize:12.5,marginBottom:12}}>{tourMsg}</div>}
          <div style={{flex:1,overflowY:'auto'}}>
          {tourView==='list'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
            <button onClick={()=>{setTourMsg('');setTourView('create');}} style={{padding:'13px',borderRadius:12,border:'none',background:'var(--ac)',color:'#101010',fontWeight:800,fontSize:14,cursor:'pointer'}}>+ Create a tournament</button>
            {tours.length===0&&<div style={{padding:'24px 6px',textAlign:'center',color:'rgba(255,255,255,.5)',fontSize:13,lineHeight:1.5}}>No tournaments yet. Create the first one, or check back when others have.</div>}
            {tours.map(t=>(<button key={t.id} onClick={()=>{setTourSel(t.id);setTourView('detail');}} style={{...card,textAlign:'left',cursor:'pointer'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8}}><span style={{fontSize:15,fontWeight:800,color:'#fff'}}>{t.name}</span><span style={{fontSize:11,fontWeight:800,color:t.status==='live'?'var(--ok)':'var(--ac2)'}}>{(t.status||'upcoming').toUpperCase()}</span></div>
              <div style={{fontSize:12,color:'rgba(255,255,255,.6)',marginTop:3}}>{(FMT[t.format]||{}).label||t.format} · {clk(t.tc)} · {whenTxt(t.startAt)}</div>
              <div style={{fontSize:11.5,color:'rgba(255,255,255,.45)',marginTop:2}}>{(t.players||[]).length} joined{joined(t)?' · you are in':''}</div>
            </button>))}
          </div>}
          {tourView==='create'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.7)',marginBottom:6}}>Name</div>
              <input value={tourName} onChange={e=>setTourName(e.target.value)} placeholder="Friday Blitz Arena" maxLength={40} style={{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',fontSize:15}}/></div>
            <div><div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.7)',marginBottom:6}}>Format</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>{Object.keys(FMT).map(k=>(<button key={k} onClick={()=>setTourFmt(k)} style={{textAlign:'left',padding:'11px 14px',borderRadius:12,cursor:'pointer',background:tourFmt===k?'rgba(var(--acr),.2)':'rgba(255,255,255,.05)',border:tourFmt===k?'1px solid var(--ac)':'1px solid rgba(255,255,255,.15)'}}>
                <div style={{fontSize:14,fontWeight:800,color:tourFmt===k?'var(--ac2)':'#fff'}}>{FMT[k].label} <span style={{fontWeight:600,fontSize:11.5,color:'rgba(255,255,255,.5)'}}>{clk(FMT[k].tc)}</span></div>
                <div style={{fontSize:11.5,color:'rgba(255,255,255,.55)',marginTop:1}}>{FMT[k].blurb}</div></button>))}</div></div>
            <div><div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.7)',marginBottom:6}}>Starts</div>
              <input type="datetime-local" value={tourWhen} onChange={e=>setTourWhen(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',fontSize:15}}/>
              <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:4}}>Leave blank for one hour from now. I pick a sensible clock for each format.</div></div>
            <div style={{display:'flex',gap:8,marginTop:2}}>
              <button onClick={()=>{setTourMsg('');setTourView('list');}} style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.06)',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>Cancel</button>
              <button onClick={doCreate} disabled={tourBusy} style={{flex:1.4,padding:'12px',borderRadius:12,border:'none',background:'var(--ac)',color:'#101010',fontWeight:800,fontSize:13,cursor:'pointer',opacity:tourBusy?.6:1}}>{tourBusy?'Creating…':'Create'}</button></div>
          </div>}
          {tourView==='detail'&&sel&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
            <button onClick={()=>{setTourView('list');setTourSel(null);}} style={{alignSelf:'flex-start',padding:'7px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,.18)',background:'rgba(255,255,255,.05)',color:'rgba(255,255,255,.8)',fontSize:12.5,cursor:'pointer'}}>‹ All tournaments</button>
            <div><div style={{fontSize:20,fontWeight:800,color:'#fff'}}>{sel.name}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,.6)',marginTop:4}}>{(FMT[sel.format]||{}).label||sel.format} · clock {clk(sel.tc)} · starts {whenTxt(sel.startAt)}</div></div>
            <div style={card}><div style={{fontSize:12,fontWeight:800,letterSpacing:.5,color:'var(--ac2)',marginBottom:8}}>PLAYERS · {(sel.players||[]).length}</div>
              {(sel.players||[]).map((p,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:9,padding:'5px 0'}}>{p.photo?<img src={p.photo} width={26} height={26} style={{borderRadius:'50%'}} alt=""/>:<span style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>👤</span>}<span style={{fontSize:13.5,color:'#fff'}}>{p.name||'Player'}</span>{sel.host===p.uid&&<span style={{fontSize:10,fontWeight:800,color:'var(--ac)'}}>HOST</span>}</div>))}
              {(sel.players||[]).length===0&&<div style={{fontSize:12.5,color:'rgba(255,255,255,.5)'}}>No players yet.</div>}</div>
            {sel.schedule&&sel.schedule.length>0&&<div style={card}><div style={{fontSize:12,fontWeight:800,letterSpacing:.5,color:'var(--ac2)',marginBottom:6}}>{sel.format==='roundrobin'?'SCHEDULE':sel.format==='knockout'?'BRACKET \u00b7 ROUND 1':'ROUND 1'}</div>
              {sel.schedule.map((rd,ri)=>(<div key={ri} style={{marginTop:ri?9:2}}>{sel.format==='roundrobin'&&<div style={{fontSize:10.5,fontWeight:700,color:'rgba(255,255,255,.4)',marginBottom:2}}>ROUND {ri+1}</div>}{rd.map((pr,pi)=>(<div key={pi} style={{fontSize:13,color:'#fff',padding:'3px 0'}}>{nameOf(pr[0])} <span style={{color:'rgba(255,255,255,.4)',fontSize:11}}>vs</span> {nameOf(pr[1])}</div>))}</div>))}</div>}
            {me&&sel.host===me.uid&&sel.status!=='live'&&(sel.players||[]).length>=2&&<button onClick={doStart} style={{padding:'13px',borderRadius:12,border:'none',background:'var(--gold)',color:'#101010',fontWeight:800,fontSize:14,cursor:'pointer'}}>Start tournament now</button>}
            {!joined(sel)?<button onClick={()=>doJoin(sel)} style={{padding:'13px',borderRadius:12,border:'none',background:'var(--ac)',color:'#101010',fontWeight:800,fontSize:14,cursor:'pointer'}}>Join this tournament</button>
              :<div style={{padding:'13px',borderRadius:12,textAlign:'center',background:'rgba(62,207,122,.14)',border:'1px solid rgba(62,207,122,.4)',color:'var(--ok)',fontWeight:800,fontSize:13.5}}>✓ You are in. Pairings appear here when it starts.</div>}
          </div>}
          </div>
        </div>);})()}
      {onlineInfo&&<div style={{position:'fixed',top:'calc(env(safe-area-inset-top,0px) + 10px)',left:'50%',transform:'translateX(-50%)',zIndex:9998,background:'linear-gradient(135deg,rgba(110,168,254,.96),rgba(74,120,220,.96))',color:'#0d1626',borderRadius:14,padding:'10px 16px',fontSize:'clamp(11px,2.5vw,13px)',fontWeight:800,boxShadow:'0 8px 24px rgba(0,0,0,.5)',maxWidth:'92vw',textAlign:'center',animation:'ctDrop .4s cubic-bezier(.2,1.4,.4,1)'}}>{onlineInfo}<style>{'@media (prefers-reduced-motion: no-preference){@keyframes ctDrop{from{transform:translate(-50%,-16px);opacity:0}to{transform:translate(-50%,0);opacity:1}}}'}</style></div>}
      {recCap&&(<div style={{position:'fixed',top:'calc(env(safe-area-inset-top,0px) + 8px)',left:'50%',transform:'translateX(-50%)',zIndex:9998,background:'rgba(10,12,18,.92)',border:'1px solid rgba(110,168,254,.55)',borderRadius:12,padding:'8px 14px',color:'#cfe0ff',fontSize:13,fontWeight:800,boxShadow:'0 6px 20px rgba(0,0,0,.5)',pointerEvents:'none',whiteSpace:'nowrap',maxWidth:'92vw',overflow:'hidden',textOverflow:'ellipsis'}}>🎬 {BUILD_INFO?BUILD_INFO.split(' ')[0]+' · ':''}{recCap.i>0?recCap.i+'/'+recCap.n+' · ':''}{recCap.l}</div>)}
      {diagMsg&&(<div style={{position:'fixed',bottom:'calc(env(safe-area-inset-bottom,0px) + 54px)',left:'50%',transform:'translateX(-50%)',zIndex:9998,background:'rgba(10,12,18,.95)',border:'1px solid rgba(110,168,254,.55)',borderRadius:12,padding:'10px 16px',color:'#cfe0ff',fontSize:13,fontWeight:700,boxShadow:'0 6px 20px rgba(0,0,0,.5)',pointerEvents:'none',maxWidth:'90vw',textAlign:'center'}}>🩺 {diagMsg}</div>)}
      {shareMsg&&(<div style={{position:'fixed',bottom:'calc(env(safe-area-inset-bottom,0px) + 54px)',left:'50%',transform:'translateX(-50%)',zIndex:9998,background:'rgba(10,12,18,.95)',border:'1px solid rgba(110,168,254,.55)',borderRadius:12,padding:'10px 16px',color:'#cfe0ff',fontSize:13,fontWeight:700,boxShadow:'0 6px 20px rgba(0,0,0,.5)',pointerEvents:'none',maxWidth:'90vw',textAlign:'center'}}>{shareMsg}</div>)}
      {!preview&&!fbOpen&&<button onClick={()=>{setFbText('');setFbSent(false);setFbCopied(false);setFbOpen(true);}} title="Send feedback to Claude" style={{position:'fixed',left:'calc(env(safe-area-inset-left,0px) + 48px)',bottom:'calc(env(safe-area-inset-bottom,0px) + 8px)',zIndex:9997,width:34,height:34,borderRadius:10,border:'1px solid rgba(110,168,254,.45)',background:'rgba(20,24,32,.7)',color:'rgba(255,255,255,.85)',fontSize:15,cursor:'pointer',padding:0}}>{'\uD83D\uDCAC'}</button>}
      {!preview&&!fbOpen&&<button onClick={()=>setPreview(true)} title="Preview gallery (dev)" style={{position:'fixed',left:'calc(env(safe-area-inset-left,0px) + 8px)',bottom:'calc(env(safe-area-inset-bottom,0px) + 8px)',zIndex:9997,width:34,height:34,borderRadius:10,border:'1px solid rgba(255,255,255,.2)',background:'rgba(20,24,32,.7)',color:'rgba(255,255,255,.85)',fontSize:15,cursor:'pointer',padding:0}}>🎬</button>}
      {preview&&(()=>{const _ev=LIB.findIndex(o=>o.name&&o.name.indexOf('Evans')>=0);
        const _lesson=(i)=>{const j=i>=0?i:0;setHomeScreen(false);setMode('learn');selectOpening(j);setTimeout(()=>setIntroCard(false),60);};
        const _picker=(i)=>{const j=i>=0?i:0;setHomeScreen(false);setMode('learn');selectOpening(j);setDemoPlaying(false);setTimeout(()=>{setDemoPlaying(false);setDemoPly((LIB[j].line||[]).length);},200);};
        const _play=(fen,col)=>{setHomeScreen(false);setOpenIdx(null);setOpponent('computer');setPColor(col);setTimeCtrl(null);timeCtrlRef.current=null;setPlaySetup(false);setMode('play');fullReset(fromFEN(fen));};
        const _autogame=()=>{
          setHomeScreen(false);setOpenIdx(null);setPlaySetup(false);setMode('play');setOpponent('demo');setPColor('w');setTimeCtrl(null);timeCtrlRef.current=null;setFlip(false);
          fullReset(initGame());
          const SCRIPT=['e4','e5','Bc4','Nc6','Qh5','Nf6','Qxf7'];
          let g=initGame(),i=0;
          const stepFn=()=>{
            if(i>=SCRIPT.length)return;
            const mv=findMoveBySAN(g,SCRIPT[i]);if(!mv)return;
            const ng=makeMove(g,mv);const pc=ng.board[mv.tr][mv.tc];
            setGame(ng);setLastMv(mv);
            setAnim({piece:pc,from:[mv.fr,mv.fc],to:[mv.tr,mv.tc]});setAnimTo(false);
            requestAnimationFrame(()=>requestAnimationFrame(()=>setAnimTo(true)));
            setTimeout(()=>setAnim(null),520);
            g=ng;i++;setTimeout(stepFn,1150);
          };
          setTimeout(stepFn,750);
        };
        const _it=Math.max(0,LIB.findIndex(o=>o.name==='Italian Game'));
        const SC=[
          {l:"Petroff (Russian) Defense - new (#233)", n:"Common Black defense to 1.e4 (symmetrical Nf6). Confirm the first move auto-plays, the board flips, and the notes explain the d6-before-recapture point.", r:()=>_lesson(LIB.findIndex(o=>o.name==="Petroff (Russian) Defense"))},
          {l:"Reading Chess Notation - NEW lesson (#230)", n:"New theory lesson teaching algebraic notation move by move. Confirm the demo plays through and the notes explain each notation type (pawn moves, piece letters N/B, captures x, castling O-O).", r:()=>_lesson(LIB.findIndex(o=>o.name==='Reading Chess Notation'))},
          {l:"Italian Game - cleaned notes (#229)", n:"Old lesson. The per-move notes no longer repeat the move (the header already shows it). Confirm they read cleanly under each move label.", r:()=>_lesson(LIB.findIndex(o=>o.name==='Italian Game'))},
          {l:"Sicilian Defense - cleaned notes (#229)", n:"Old lesson. Confirm the notes read cleanly with no move-prefix repetition.", r:()=>_lesson(LIB.findIndex(o=>o.name==='Sicilian Defense'))},
          {l:"Square of the Pawn - box viz", n:"Tap 'Show the square of the pawn' under the board. The tinted box + catches/promotes verdict should appear and shrink as the pawn advances.", r:()=>_lesson(LIB.findIndex(o=>o.name==='Square of the Pawn'))},
          {l:"King's Gambit: Cunningham - Prev/Next + header", n:"Check the header shows the lesson name (not CHESS TRAINER) and the Prev/Next buttons step between gambits.", r:()=>_lesson(LIB.findIndex(o=>o.name==="King's Gambit: Cunningham"))},
          {l:"Arabian Mate (pattern)", n:"Rook + knight corner mate. Confirm the board and the single mating move.", r:()=>_lesson(LIB.findIndex(o=>o.name==='Arabian Mate'))},
          {l:"Epaulette Mate (pattern)", n:"Queen mate, king boxed by its own rooks.", r:()=>_lesson(LIB.findIndex(o=>o.name==='Epaulette Mate'))},
          {l:"Dovetail Mate (pattern)", n:"Queen mate, king flanked by its own pawns.", r:()=>_lesson(LIB.findIndex(o=>o.name==='Dovetail Mate'))},
          {l:"Two Knights Defense (Black)", n:"Confirm White's first move auto-plays and the board flips.", r:()=>_lesson(LIB.findIndex(o=>o.name==='Two Knights Defense'))},
          {l:"Ruy Lopez: Closed (White)", n:"Main-line Ruy. Confirm the board and notes render.", r:()=>_lesson(LIB.findIndex(o=>o.name==='Ruy Lopez: Closed'))},
          {l:"Caro-Kann: Classical (Black)", n:"Confirm the board and notes render.", r:()=>_lesson(LIB.findIndex(o=>o.name==='Caro-Kann: Classical'))},
        ];
        const _runAll=()=>{
          setPreview(false);const N=SC.length;let i=0;
          const go=()=>{
            if(i>=N){setRecCap({i:N,n:N,l:'All done. You can stop recording.'});setTimeout(()=>{setRecCap(null);setPreview(true);},4500);return;}
            const sc=SC[i];setRecCap({i:i+1,n:N,l:sc.l});sc.r();const hold=sc.h||5000;i++;setTimeout(go,hold);
          };
          setRecCap({i:0,n:N,l:'Starting…'});setTimeout(go,1300);
        };
        return(<div style={{position:'fixed',inset:0,zIndex:9990,background:'rgba(8,10,16,.94)',display:'flex',flexDirection:'column',padding:'calc(env(safe-area-inset-top,0px) + 16px) 16px 16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}><div style={{fontSize:16,fontWeight:800,color:'#fff'}}>Preview gallery {BUILD_INFO&&<span style={{fontSize:11,fontWeight:700,color:'var(--ac2)',fontFamily:'ui-monospace,Menlo,Consolas,monospace',marginLeft:6}}>{BUILD_INFO.split(' ')[0]}</span>}</div><button onClick={()=>setPreview(false)} style={{width:34,height:34,borderRadius:10,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.06)',color:'#fff',fontSize:16,cursor:'pointer'}}>✕</button></div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.55)',marginBottom:14,lineHeight:1.4}}>Tap one to jump to that screen, then screen-record or screenshot it for me. This list holds only what I still need. As I confirm screens I remove them, so you never re-shoot the same thing. It grows as I need things. Or, to catch them in one clip: start your iPhone screen recording first (Control Center), THEN tap Play all up top and let it run.</div>
          {SC.length>=1&&<button onClick={_runAll} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',padding:'13px 15px',borderRadius:12,marginBottom:10,background:'linear-gradient(135deg,#6ea8fe,#3b76e8)',border:'none',color:'#0a1020',fontSize:14,fontWeight:800,cursor:'pointer'}}>▶ Play {SC.length>1?('all '+SC.length+' '):''}(screen-record this)</button>}
          <button onClick={()=>{const j=collectDiagnostics();let ok=false;try{navigator.clipboard.writeText(j);ok=true;}catch(e){}if(!ok){try{const ta=document.createElement('textarea');ta.value=j;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');document.body.removeChild(ta);ok=true;}catch(_){}}try{postReport('diag',JSON.parse(j));}catch(_){}setPreview(false);setDiagMsg(LOG_ENDPOINT?('Sent to Claude'+(ok?' and copied':'')):(ok?'Copied. Paste it to Claude here.':'Could not copy. Screenshot this instead.'));setTimeout(()=>setDiagMsg(''),5000);}} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',padding:'12px 15px',borderRadius:12,marginBottom:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.18)',color:'#cfe0ff',fontSize:13,fontWeight:700,cursor:'pointer'}}>🩺 Send Claude a diagnostics report</button>
          <div style={{display:'flex',flexDirection:'column',gap:8,overflowY:'auto'}}>{SC.map((x,i)=>(<button key={i} onClick={()=>{setPreview(false);x.r();}} style={{textAlign:'left',padding:'13px 15px',borderRadius:12,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.14)',cursor:'pointer'}}><div style={{fontSize:14,fontWeight:700,color:'#fff'}}>{x.l}</div><div style={{fontSize:11,color:'rgba(255,255,255,.5)',marginTop:2}}>{x.n}</div></button>))}{SC.length===0&&<div style={{padding:'18px 4px',color:'rgba(255,255,255,.5)',fontSize:13,lineHeight:1.5}}>Nothing needed right now. I will add screens here whenever I need a fresh recording, and remove them once you send them.</div>}</div>
        </div>);})()}
      {celebrate&&(celebrate.kind==='bank'
        ?<div onClick={()=>setCelebrate(null)} style={{position:'fixed',top:'calc(env(safe-area-inset-top,0px) + 10px)',left:'50%',transform:'translateX(-50%)',zIndex:9999,display:'flex',alignItems:'center',gap:10,background:'linear-gradient(135deg,rgba(62,207,122,.96),rgba(40,160,90,.96))',borderRadius:14,padding:'11px 16px',boxShadow:'0 8px 24px rgba(0,0,0,.5)',color:'#06180c',maxWidth:'92vw',animation:'ctDrop .5s cubic-bezier(.2,1.4,.4,1)'}}><span style={{fontSize:20,lineHeight:1}}>✅</span><span style={{minWidth:0}}><b style={{display:'block',fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{celebrate.title}</b><span style={{fontSize:11.5,opacity:.85}}>{celebrate.sub}</span></span><style>{'@media (prefers-reduced-motion: no-preference){@keyframes ctDrop{from{transform:translate(-50%,-16px);opacity:0}to{transform:translate(-50%,0);opacity:1}}@keyframes ctStamp{0%{transform:scale(2.6);opacity:0}70%{transform:scale(.94)}100%{transform:scale(1);opacity:1}}@keyframes ctFall{to{transform:translateY(70vh) rotate(540deg);opacity:0}}}'}</style></div>
        :<div onClick={()=>setCelebrate(null)} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(8,10,16,.78)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{position:'relative',overflow:'hidden',textAlign:'center',maxWidth:380,width:'100%',background:celebrate.kind==='mastered'?'radial-gradient(120% 120% at 50% 0%,rgba(240,194,77,.3),rgba(20,16,8,.97) 60%)':'radial-gradient(120% 120% at 50% 0%,rgba(110,168,254,.28),rgba(10,14,22,.97) 60%)',border:'1px solid '+(celebrate.kind==='mastered'?'var(--gold)':'var(--ac)'),borderRadius:20,padding:'30px 18px 22px',boxShadow:'0 18px 50px rgba(0,0,0,.6)'}}>
            {celebrate.kind==='mastered'&&[12,30,52,71,88].map((l,i)=><span key={i} style={{position:'absolute',top:-10,left:l+'%',width:7,height:11,borderRadius:2,background:['var(--gold)','var(--ac)','var(--ok)','#ff9d8d','var(--ac2)'][i],animation:'ctFall 2.2s '+(i*0.3)+'s linear infinite'}}/>)}
            <div style={{fontSize:44,lineHeight:1,animation:'ctStamp .7s cubic-bezier(.2,1.6,.3,1) both'}}>{celebrate.kind==='mastered'?'🏅':'✓'}</div>
            <div style={{fontSize:19,fontWeight:800,margin:'6px 0 2px',letterSpacing:1.5,color:celebrate.kind==='mastered'?'var(--gold)':'var(--ac2)'}}>{celebrate.kind==='mastered'?'MASTERED':'LEARNED'}</div>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>{celebrate.title}</div>
            <div style={{fontSize:11.5,color:'rgba(255,255,255,.62)',marginTop:3}}>{celebrate.sub}</div>
            <button onClick={()=>setCelebrate(null)} style={{marginTop:14,padding:'10px 24px',borderRadius:12,border:'none',background:celebrate.kind==='mastered'?'var(--gold)':'var(--ac)',color:'#101010',fontWeight:800,fontSize:13,cursor:'pointer'}}>Keep going</button>
          <style>{'@media (prefers-reduced-motion: no-preference){@keyframes ctDrop{from{transform:translate(-50%,-16px);opacity:0}to{transform:translate(-50%,0);opacity:1}}@keyframes ctStamp{0%{transform:scale(2.6);opacity:0}70%{transform:scale(.94)}100%{transform:scale(1);opacity:1}}@keyframes ctFall{to{transform:translateY(70vh) rotate(540deg);opacity:0}}}'}</style></div></div>)}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Cinzel:wght@600;700&family=Baloo+2:wght@600;700;800&display=swap');*{box-sizing:border-box;}button:active{transform:translateY(1px);filter:brightness(.93);}select,textarea{font-family:inherit;}textarea{touch-action:auto;}input:not([type=range]),textarea{font-size:16px !important;}.scroll::-webkit-scrollbar{height:5px;width:5px;}.scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:3px;}.ctside>*{max-width:100%!important;min-width:0!important;}@keyframes iconpop{0%{transform:scale(.4) rotate(-14deg);opacity:0}60%{transform:scale(1.14) rotate(5deg)}100%{transform:scale(1) rotate(0);opacity:1}}@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes brilburst{0%{transform:scale(.35);opacity:.85}100%{transform:scale(1.85);opacity:0}}@keyframes ctqdrop{0%{transform:translateY(-175px) rotate(-6deg);opacity:0}10%{opacity:1}64%{transform:translateY(0) rotate(0)}74%{transform:translateY(0) scaleY(.87) scaleX(1.1)}85%{transform:translateY(-8px) scaleY(1.04) scaleX(.98)}100%{transform:translateY(0) scaleY(1) scaleX(1)}}@keyframes ctTopL{0%{transform:rotate(0) translate(0,0);opacity:1}100%{transform:rotate(-86deg) translate(-22px,9px);opacity:0}}@keyframes ctTopR{0%{transform:rotate(0) translate(0,0);opacity:1}100%{transform:rotate(86deg) translate(22px,9px);opacity:0}}.ct-qdrop{animation:ctqdrop 3s cubic-bezier(.42,0,.5,1) both}.ct-topl{animation:ctTopL 1.2s cubic-bezier(.3,.45,.5,1) both}.ct-topr{animation:ctTopR 1.2s cubic-bezier(.3,.45,.5,1) both}`}</style>

      {homeScreen&&(<div style={{position:'fixed',inset:0,zIndex:500,background:baseBg,backgroundImage:appBgImg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:`max(36px,env(safe-area-inset-top,0px)) 18px max(20px,env(safe-area-inset-bottom,0px))`,overflowY:'auto',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        <button onClick={()=>{setUpgradeMsg('');setAcctOpen(true);}} title={cloudUser?'Account':'Sign in'} style={{position:'fixed',top:'calc(env(safe-area-inset-top,0px) + 14px)',right:'calc(env(safe-area-inset-right,0px) + 16px)',zIndex:6,width:46,height:46,borderRadius:'50%',padding:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:cloudUser?'rgba(var(--acr),.18)':'rgba(255,255,255,.08)',border:'2px solid rgba(var(--acr),.55)',cursor:'pointer',boxShadow:'0 3px 10px rgba(0,0,0,.4)'}}>{cloudUser&&cloudUser.photo?<img src={cloudUser.photo} alt="" referrerPolicy="no-referrer" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:22,lineHeight:1}}>{cloudUser?'👤':'👋'}</span>}</button>
        <div style={{width:'100%',maxWidth:hLand?Math.min(vp.w-40,1000):(hbig?660:420),display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div onClick={()=>setIntroN(n=>n+1)} title="Tap to replay" style={{cursor:'pointer',width:'100%'}}><HomeIntro key={introN} big={hbig} compact={hLand} force={introN>0}/></div>
          <div style={{textAlign:'center',marginBottom:hbig?40:(hLand?26:32)}}>
            <div style={{fontFamily:"var(--head)",color:'var(--ac)',fontSize:hbig?'clamp(46px,6.4vw,66px)':'clamp(30px,8vw,46px)',letterSpacing:hbig?4:3,textShadow:`0 2px 24px rgba(${TH.rgb},.55)`,display:'flex',alignItems:'center',justifyContent:'center',whiteSpace:'nowrap'}}>CHESS TRAINER</div>
            <div style={{color:'rgba(255,255,255,.38)',fontSize:hbig?14:11,marginTop:hbig?10:(hLand?5:7),letterSpacing:2,textTransform:'uppercase'}}>Your personal chess coach</div>
          </div>
          {(()=>{const isNew=!(pzXP>0||Object.values(trainMastery||{}).some(m=>m&&m.learned));if(!isNew)return null;const ti=LIB.map((o,i)=>i).filter(i=>{const g=groupOf(LIB[i].cat);return g==='openings'||g==='gambits';});const start=ti.length?ti[0]:0;return(<button onClick={()=>selectOpening(start)} style={{width:'100%',marginBottom:hbig?22:16,padding:'16px 18px',borderRadius:16,border:'none',cursor:'pointer',textAlign:'left',background:'linear-gradient(135deg,var(--ac),var(--ac2))',boxShadow:'0 6px 22px rgba(0,0,0,.3)'}}><div style={{fontSize:12,fontWeight:800,letterSpacing:.5,color:'rgba(0,0,0,.55)',textTransform:'uppercase'}}>New here? Start here</div><div style={{fontSize:'clamp(15px,3.6vw,18px)',fontWeight:800,color:'#0b0b0b',marginTop:3}}>Learn your first opening →</div><div style={{fontSize:'clamp(11px,2.5vw,13px)',color:'rgba(0,0,0,.62)',marginTop:2}}>Two minutes, move by move. You will finish with your first win banked.</div></button>);})()}
          <div style={{display:'grid',gridTemplateColumns:hLand?'repeat(4,1fr)':'1fr 1fr',gap:hbig?22:(hLand?30:16),width:'100%'}}>
            {[
              {icon:'🔭',label:'Discover',sub:'Openings, gambits & endgames',tint:['#3b82f6','#1d4ed8'],k:'learn',fn:()=>{setHomeScreen(false);setMode('learn');setOpenIdx(null);setLearnGroup(null);}},
              {icon:'🧩',label:'Puzzles',sub:'890+ tactical puzzles',tint:['#f59e0b','#b45309'],pro:false,k:'puzzle',fn:()=>{setMistakeMode(false);setHomeScreen(false);setMode('puzzle');setOpenIdx(null);setPzView('roadmap');}},
              {icon:'🔍',label:'Review',sub:'Free unlimited game reviews',tint:['#a855f7','#7c3aed'],k:'analyze',fn:()=>{setHomeScreen(false);setMode('analyze');}},
              {icon:'♟️',label:'Play',sub:'vs Computer or Human',big:true,tint:['#22c55e','#15803d'],k:'play',fn:()=>{setHomeScreen(false);setMode('play');setOpenIdx(null);setSetupFromFEN(null);setPlaySetup(true);}},
            ].map(({icon,label,sub,fn,big,tint,pro,k})=>{
              const ic=(SK.icons&&SK.icons[k])||icon; const tn=(SK.tints&&SK.tints[k])||tint;
              return(
              <button key={label} onClick={fn} style={{background:'transparent',border:'none',padding:'10px 4px',cursor:'pointer',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',color:'inherit'}}>
                <div style={{position:'relative',width:84*(hbig?1.32:(hLand?1.74:1)),height:84*(hbig?1.32:(hLand?1.74:1)),borderRadius:hbig?30:(hLand?30:24),display:'flex',alignItems:'center',justifyContent:'center',marginBottom:hbig?14:(hLand?18:11),fontSize:42*(hbig?1.3:(hLand?1.64:1)),lineHeight:1,background:`linear-gradient(150deg,${tn[0]},${tn[1]})`,border:SK.trim?`1.5px solid ${SK.trim}`:'none',boxShadow:`0 5px 0 rgba(0,0,0,.28),0 13px 22px ${tn[1]}66,inset 0 2px 0 rgba(255,255,255,.5),inset 0 -5px 9px rgba(0,0,0,.28)`}}>{SK.key==='classic'&&(k==='puzzle'||k==='play')?<Piece t={k==='puzzle'?'n':'k'} color="w" sz={Math.round(52*(hbig?1.3:(hLand?1.64:1)))}/>:ic}{pro&&!isPro&&<span style={{position:'absolute',top:-7,right:-7,fontSize:'clamp(8px,1.7vw,10px)',fontWeight:800,color:'#2a2010',background:'#f0d48a',borderRadius:8,padding:'2px 6px',boxShadow:'0 2px 5px rgba(0,0,0,.45)'}}>PRO</span>}</div>
                <div style={{color:'rgba(255,255,255,.98)',fontSize:hbig?'clamp(22px,2.4vw,27px)':(hLand?'clamp(20px,2.5vw,27px)':'clamp(16px,4.3vw,20px)'),fontWeight:800,marginBottom:hbig?6:4,letterSpacing:.3}}>{label}</div>
                <div style={{color:'rgba(255,255,255,.5)',fontSize:hbig?'clamp(12.5px,1.5vw,15px)':(hLand?'clamp(12.5px,1.6vw,15.5px)':'clamp(9.5px,2.3vw,11.5px)'),lineHeight:1.4}}>{sub}</div>
              </button>);})}
          </div>
          {(()=>{const cn=coachNudge();return(
            <div onClick={()=>{if(!isPro){setUpgradeMsg('');setAcctOpen(true);}else setCoachOpen(true);}} style={{marginTop:16,width:'100%',display:'flex',alignItems:'center',gap:12,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.14)',borderRadius:16,padding:'12px 13px',boxShadow:SHADOW_BOX,cursor:'pointer'}}>
              <Coach size={46} accent="var(--ac)" style={coachStyle}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'clamp(9px,2.1vw,11px)',color:'var(--ac2)',fontWeight:800,letterSpacing:.5,textTransform:'uppercase'}}>Your coach</div>
                <div style={{fontSize:'clamp(11.5px,2.6vw,13.5px)',color:'rgba(255,255,255,.9)',fontWeight:600,lineHeight:1.35,marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cn.tip}</div>
              </div>
              {isPro?<span style={{flexShrink:0,fontSize:22,color:'var(--ac2)',opacity:.7}}>›</span>:<span style={{flexShrink:0,fontSize:'clamp(9px,2vw,11px)',fontWeight:800,color:'#2a2010',background:'#f0d48a',borderRadius:8,padding:'3px 8px',boxShadow:'0 2px 5px rgba(0,0,0,.35)'}}>PRO 🔒</span>}
            </div>);})()}
          <div style={{marginTop:18,width:'100%',display:'flex',flexDirection:'column',gap:10,alignItems:'center'}}>
            <div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={()=>setTheme((theme+1)%THEMES.length)} title="Tap to change board colors" style={{display:'flex',alignItems:'center',gap:6,padding:'6px 11px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.16)',color:'rgba(255,255,255,.82)',cursor:'pointer',fontSize:'clamp(9px,2.1vw,11px)',fontWeight:600,boxShadow:SHADOW_BTN}}><span style={{width:16,height:16,borderRadius:4,overflow:'hidden',display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',flexShrink:0}}><span style={{background:TH.light}}/><span style={{background:TH.dark}}/><span style={{background:TH.dark}}/><span style={{background:TH.light}}/></span>Colors: {TH.name}</button>
              <button onClick={()=>{if(!isPro){setUpgradeMsg('');setAcctOpen(true);}else setSkin((skin+1)%SKINS.length);}} title={isPro?"Tap to change style":"Playful & Medieval are Pro"} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 11px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.16)',color:'rgba(255,255,255,.82)',cursor:'pointer',fontSize:'clamp(9px,2.1vw,11px)',fontWeight:600,boxShadow:SHADOW_BTN}}><span style={{width:16,height:16,borderRadius:4,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:headFont,fontSize:11,fontWeight:700,color:'#fff',background:'rgba(255,255,255,.12)'}}>A</span>Style: {SK.name}{!isPro&&<span style={{marginLeft:4}}>🔒</span>}</button>
            </div>
          </div>
          {BUILD_INFO&&<div style={{marginTop:14,fontSize:11,color:'rgba(255,255,255,.3)',letterSpacing:.5,textAlign:'center',fontFamily:'ui-monospace,Menlo,Consolas,monospace'}}>Build {BUILD_INFO}</div>}
        </div>
      </div>)}

      {coachOpen&&(()=>{const plan=coachPlan();const rows=[];
        rows.push({ic:'🎯',lab:'Train your openings',sub:'Drill the lines you know, move by move',tint:['#14b8a6','#0f766e'],on:()=>{setCoachOpen(false);setHomeScreen(false);setMode('learn');setOpenIdx(null);setLearnGroup('train');}});
        if(lastLesson!=null&&LIB[lastLesson])rows.push({ic:'↩',lab:'Continue where you left off',sub:LIB[lastLesson].name,tint:['#f0a24e','#b4631f'],on:()=>{setCoachOpen(false);setHomeScreen(false);selectOpening(lastLesson);}});
        if(_coachRec)rows.push({ic:'🦉',lab:"Coach's pick",sub:'Try '+_coachRec.name,tint:['#7bbf5a','#4a7a33'],on:()=>{setCoachOpen(false);setHomeScreen(false);selectOpening(_coachRec.idx);}});
        rows.push({ic:'🔤',lab:'Read chess notation',sub:'Squares, pieces & move symbols',tint:['#0ea5e9','#0369a1'],on:()=>{setCoachOpen(false);setHomeScreen(false);setMode('learn');setOpenIdx(null);setLearnGroup('notation');}});
        return(<div style={{position:'fixed',inset:0,zIndex:540,background:baseBg,backgroundImage:appBgImg,display:'flex',flexDirection:'column',alignItems:'center',padding:`max(56px,calc(env(safe-area-inset-top,0px) + 12px)) 18px max(20px,env(safe-area-inset-bottom,0px))`,overflowY:'auto',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
          <div style={{width:'100%',maxWidth:460,display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>setCoachOpen(false)} style={{minWidth:36,height:32,borderRadius:12,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.18)',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:14,padding:'0 11px'}}>‹ Home</button>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:13}}>
              <Coach size={58} accent="var(--ac)" style={coachStyle}/>
              <div><div style={{fontFamily:headFont,fontSize:'clamp(20px,5vw,26px)',fontWeight:800,color:'#fff',letterSpacing:.3}}>Your coach</div><div style={{fontSize:'clamp(11px,2.5vw,13px)',color:'rgba(255,255,255,.6)',marginTop:2}}>I'll guide your training. Pick where to go next.</div></div>
            </div>
            <div style={{background:'linear-gradient(135deg,rgba(var(--acr),.16),rgba(var(--acr),.05))',border:'1px solid rgba(var(--acr),.32)',borderRadius:14,padding:'12px 13px 13px',boxShadow:SHADOW_BOX}}>
              <div style={{fontSize:'clamp(10px,2.2vw,12px)',color:'var(--ac2)',fontWeight:800,letterSpacing:.5,textTransform:'uppercase',marginBottom:9}}>Today's plan</div>
              <div style={{display:'flex',flexDirection:'column',gap:9}}>
                {plan.map((p,pi)=>(<div key={pi} style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{flexShrink:0,fontSize:17,lineHeight:1,width:22,textAlign:'center'}}>{p.ic}</span>
                  <span style={{flex:1,minWidth:0,fontSize:'clamp(11.5px,2.6vw,13.5px)',color:'rgba(255,255,255,.9)',lineHeight:1.4}}>{p.text}</span>
                  <button onClick={p.go} style={{flexShrink:0,padding:'6px 12px',borderRadius:12,background:'var(--ac)',border:'none',color:'#1a1a1a',fontWeight:800,fontSize:'clamp(10px,2.3vw,12px)',cursor:'pointer',boxShadow:'0 2px 0 rgba(0,0,0,.25)'}}>{p.goLabel}</button>
                </div>))}
              </div>
            </div>
            <div style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.14)',borderRadius:14,boxShadow:SHADOW_BOX,overflow:'hidden'}}>
              {(()=>{
                const SLATE=5;
                const elig=LIB.map((o,i)=>({o,i})).filter(x=>{const gp=groupOf(x.o.cat);return gp==='openings'||gp==='gambits';});
                const dN=nm=>{const _o=LIB.find(o=>o.name===nm);return _o?lessonStats(_o).unionDays:(((learnProg[nm]||{}).days||[]).length);};
                const covOf=nm=>{const _o=LIB.find(o=>o.name===nm);return _o?lessonStats(_o).coverage:false;};
                const lnOf=nm=>{const _o=LIB.find(o=>o.name===nm);return _o?lessonStats(_o):{lines:1,linesLearned:0,unionDays:0,coverage:false,mastered:false};};
                const _today=dstr(new Date());
                const tIdx=coachTargets.map(n=>LIB.findIndex(o=>o.name===n)).filter(i=>i>=0);
                const learnedInSlate=tIdx.filter(i=>covOf(LIB[i].name)).length;
                const slateFull=tIdx.length>=SLATE;
                const tierReady=slateFull&&learnedInSlate>=SLATE;
                const refillIn=Math.max(1,Math.ceil((432000000-(Date.now()-(coachTier.swapAt||0)))/86400000));
                const learnedTot=elig.filter(x=>covOf(x.o.name)).length, mastTot=elig.filter(x=>lnOf(x.o.name).mastered).length, bankedToday=tIdx.filter(i=>linesOf(LIB[i]).some(l=>lineDays(l.key).indexOf(_today)>=0)).length;
                const chip=(on,lab,fn)=>(<button key={lab} onClick={fn} style={{padding:'7px 11px',borderRadius:18,border:on?'1.5px solid var(--ac)':'1px solid rgba(255,255,255,.2)',background:on?'rgba(var(--acr),.22)':'rgba(255,255,255,.05)',color:on?'var(--ac2)':'rgba(255,255,255,.75)',fontWeight:800,fontSize:'clamp(9.5px,2.1vw,11px)',cursor:'pointer'}}>{lab}</button>);
                const f0=x=>{const f=x.o.line&&x.o.line[0];return f==='e4'?'e4':f==='d4'?'d4':'other';};
                const styleOf=x=>groupOf(x.o.cat)==='gambits'?payoffOf(x.o):'solid';
                const match=(x,keep)=>((!keep.side)||coachPick.side==='any'||x.o.side===coachPick.side)&&((!keep.kind)||coachPick.kind==='any'||groupOf(x.o.cat)===coachPick.kind)&&((!keep.fm)||coachPick.fm==='any'||f0(x)===coachPick.fm)&&((!keep.style)||coachPick.style==='any'||styleOf(x)===coachPick.style||(coachPick.style==='solid'&&styleOf(x)==='edge'));
                const addable=x=>!covOf(x.o.name)&&coachTargets.indexOf(x.o.name)<0;
                const addToSlate=nm=>{setCoachTargets(t=>(t.length>=SLATE||t.indexOf(nm)>=0)?t:[...t,nm]);};
                const swapOut=nm=>{if((coachTier.swapsLeft||0)<=0)return;setCoachTargets(t=>t.filter(x=>x!==nm));setCoachTier(t=>({...t,swapsLeft:t.swapsLeft-1}));};
                const startNextTier=()=>{setCoachTier(t=>({cleared:(t.cleared||0)+1,swapsLeft:2,swapAt:Date.now()}));setCoachTargets([]);setCoachChooserOpen(false);};
                const suggest=()=>{const need=SLATE-tIdx.length;if(need<=0){setCoachChooserOpen(false);return;}
                  const tries=[{side:1,kind:1,fm:1,style:1},{side:1,kind:1,fm:1},{side:1,kind:1,style:1},{side:1,kind:1},{side:1},{}];const seen=new Set(coachTargets);const picks=[];
                  for(const k of tries){const lvl=elig.filter(y=>addable(y)&&match(y,k));for(const x of lvl){if(!seen.has(x.o.name)){seen.add(x.o.name);picks.push(x.o.name);if(picks.length>=need)break;}}if(picks.length>=need)break;}
                  setCoachTargets(t=>[...t,...picks].slice(0,SLATE));setCoachChooserOpen(false);};
                const CURATED=["Italian Game","Evans Gambit","Caro-Kann Defense","Smith-Morra Gambit","London System","Stafford Gambit: Mating Trap","King's Indian Defense","Danish Gambit","Scholar's Mate","Englund Gambit: Rosen Trap"];
                const autoPick=()=>{const need=SLATE-tIdx.length;if(need<=0){setCoachChooserOpen(false);return;}
                  const pool=elig.filter(addable);const rank=x=>{const k=CURATED.indexOf(x.o.name);return k<0?100+x.i:k;};
                  const sorted=pool.slice().sort((p,q)=>rank(p)-rank(q));
                  const picks=[];const want=['gambits','openings'];let wi=0;
                  while(picks.length<need&&sorted.length){let ix=sorted.findIndex(x=>groupOf(x.o.cat)===want[wi%2]);if(ix<0)ix=0;picks.push(sorted.splice(ix,1)[0].o.name);wi++;}
                  setCoachTargets(t=>[...t,...picks].slice(0,SLATE));setCoachChooserOpen(false);};
                return(<>
                <button onClick={()=>setCoachPlanOpen(v=>!v)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'12px 13px',background:'transparent',border:'none',color:'#fff',cursor:'pointer',textAlign:'left'}}>
                  <span style={{flexShrink:0,fontSize:20,lineHeight:1}}>📋</span>
                  <span style={{flex:1,minWidth:0}}>
                    <span style={{display:'block',fontSize:'clamp(12px,2.8vw,14px)',fontWeight:800,color:'var(--ac2)',letterSpacing:.4,textTransform:'uppercase'}}>Mastery plan · Tier {(coachTier.cleared||0)+1}</span>
                    <span style={{display:'block',fontSize:'clamp(9.5px,2.1vw,11px)',color:'rgba(255,255,255,.55)',marginTop:1}}>{tIdx.length===0?'Your report card. Open it and pick the '+SLATE+' lessons YOU want to learn.':(learnedInSlate+'/'+SLATE+' learned this tier · '+bankedToday+' banked today · '+mastTot+' mastered overall')}</span>
                  </span>
                  <span style={{flexShrink:0,fontSize:17,color:'var(--ac2)',transform:coachPlanOpen?'rotate(90deg)':'none',transition:'transform .15s'}}>›</span>
                </button>
                {coachPlanOpen&&<div style={{padding:'0 13px 13px'}}>
                <div style={{fontSize:'clamp(8.5px,1.9vw,10px)',color:'rgba(255,255,255,.58)',marginBottom:9}}>Pick any {SLATE} lessons you actually want · learn all {SLATE} (one flawless run each) to clear the tier · {coachTier.swapsLeft||0} swap{(coachTier.swapsLeft||0)===1?'':'s'} left (refill to 2 every 5 days)</div>
                {tierReady&&<div style={{background:'linear-gradient(135deg,rgba(240,180,41,.2),rgba(240,180,41,.06))',border:'1px solid rgba(240,180,41,.5)',borderRadius:11,padding:'12px',marginBottom:11,textAlign:'center'}}>
                  <div style={{fontSize:'clamp(13px,3vw,16px)',fontWeight:800,color:'#f0c24d'}}>🎉 Tier {(coachTier.cleared||0)+1} cleared!</div>
                  <div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'rgba(255,255,255,.7)',margin:'4px 0 9px'}}>All {SLATE} learned. They stay on your report card; keep banking days toward ★ Mastered any time.</div>
                  <button onClick={startNextTier} style={{padding:'10px 16px',borderRadius:10,border:'none',background:'#f0c24d',color:'#2a2010',fontWeight:800,fontSize:'clamp(11px,2.5vw,13px)',cursor:'pointer'}}>Start Tier {(coachTier.cleared||0)+2} · pick {SLATE} new</button>
                </div>}
                {tIdx.length>0&&<div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:10}}>{tIdx.map(i=>{const op=LIB[i];const _ls=lnOf(op.name);const n=_ls.unionDays;const m=_ls.mastered;const learned=_ls.coverage;const done=linesOf(op).some(l=>lineDays(l.key).indexOf(_today)>=0);return(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:9,background:'rgba(0,0,0,.18)',border:'1px solid '+(learned?'rgba(108,199,138,.35)':'rgba(255,255,255,.1)'),borderRadius:10,padding:'8px 10px'}}>
                    <span style={{flexShrink:0,fontSize:15,width:20,textAlign:'center'}}>{m?'⭐':done?'✅':learned?'✓':'▫️'}</span>
                    <span style={{flex:1,minWidth:0}}><span style={{display:'block',fontSize:'clamp(11px,2.5vw,13px)',fontWeight:800,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{op.name}</span><span style={{display:'block',fontSize:'clamp(8.5px,1.9vw,10px)',color:m?'#f0c24d':learned?'#6cc78a':'rgba(255,255,255,.5)'}}>{m?'Mastered':learned?('Learned · '+n+'/'+LEARN_GOAL+(done?' · banked today':'')):(_ls.lines>1?(_ls.linesLearned+'/'+_ls.lines+' lines learned'+(done?' · banked today':'')):'Not learned yet')}</span></span>
                    {!m&&!done&&<button onClick={()=>coachRun(i)} style={{flexShrink:0,padding:'6px 12px',borderRadius:12,background:'var(--ac)',border:'none',color:'#1a1a1a',fontWeight:800,fontSize:'clamp(10px,2.2vw,11.5px)',cursor:'pointer'}}>▶ Run</button>}
                    {!learned&&<button onClick={()=>swapOut(op.name)} disabled={(coachTier.swapsLeft||0)<=0} title={(coachTier.swapsLeft||0)>0?'Swap this out (uses 1 swap)':('No swaps left · refills in about '+refillIn+(refillIn===1?' day':' days'))} style={{flexShrink:0,width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.16)',color:(coachTier.swapsLeft||0)>0?'rgba(255,255,255,.6)':'rgba(255,255,255,.22)',cursor:(coachTier.swapsLeft||0)>0?'pointer':'default',fontSize:12,lineHeight:1,padding:0}}>⇄</button>}
                  </div>);})}</div>}
                {!slateFull&&Array.from({length:SLATE-tIdx.length}).map((_,k)=>(<div key={'e'+k} style={{display:'flex',alignItems:'center',gap:9,border:'1px dashed rgba(255,255,255,.22)',borderRadius:10,padding:'9px 10px',marginBottom:7,color:'rgba(255,255,255,.4)',fontSize:'clamp(10px,2.3vw,12px)'}}><span style={{fontSize:14}}>＋</span>Empty slot · answer the questions or browse below</div>))}
                {!slateFull&&(tIdx.length===0||coachChooserOpen)&&<div style={{background:'rgba(var(--acr),.10)',border:'1px solid rgba(var(--acr),.3)',borderRadius:11,padding:'10px 11px',margin:'4px 0 11px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><span style={{flex:1,fontSize:'clamp(10px,2.3vw,12px)',fontWeight:800,color:'var(--ac2)'}}>Quick questions, then I suggest lessons for your empty slots:</span>{tIdx.length>0&&<button onClick={()=>setCoachChooserOpen(false)} style={{flexShrink:0,width:30,height:30,borderRadius:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.16)',color:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:11,lineHeight:1,padding:0}}>✕</button>}</div>
                  <div style={{fontSize:'clamp(9px,2vw,10.5px)',color:'rgba(255,255,255,.55)',fontWeight:700,margin:'2px 0 5px'}}>I want to learn</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{chip(coachPick.kind==='gambits','🗡 Gambits',()=>setCoachPick(p=>({...p,kind:'gambits'})))}{chip(coachPick.kind==='openings','📖 Openings',()=>setCoachPick(p=>({...p,kind:'openings'})))}{chip(coachPick.kind==='any','Both',()=>setCoachPick(p=>({...p,kind:'any'})))}</div>
                  <div style={{fontSize:'clamp(9px,2vw,10.5px)',color:'rgba(255,255,255,.55)',fontWeight:700,margin:'8px 0 5px'}}>I want to play as</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{chip(coachPick.side==='w','♔ White',()=>setCoachPick(p=>({...p,side:'w'})))}{chip(coachPick.side==='b','♚ Black',()=>setCoachPick(p=>({...p,side:'b'})))}{chip(coachPick.side==='any','Either',()=>setCoachPick(p=>({...p,side:'any'})))}</div>
                  <div style={{fontSize:'clamp(9px,2vw,10.5px)',color:'rgba(255,255,255,.55)',fontWeight:700,margin:'8px 0 5px'}}>Against</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{chip(coachPick.fm==='e4','1.e4 games',()=>setCoachPick(p=>({...p,fm:'e4'})))}{chip(coachPick.fm==='d4','1.d4 games',()=>setCoachPick(p=>({...p,fm:'d4'})))}{chip(coachPick.fm==='any','Either',()=>setCoachPick(p=>({...p,fm:'any'})))}</div>
                  <div style={{fontSize:'clamp(9px,2vw,10.5px)',color:'rgba(255,255,255,.55)',fontWeight:700,margin:'8px 0 5px'}}>I like lines that</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{chip(coachPick.style==='mate','♚ End in mate traps',()=>setCoachPick(p=>({...p,style:'mate'})))}{chip(coachPick.style==='win','♛ Win material',()=>setCoachPick(p=>({...p,style:'win'})))}{chip(coachPick.style==='solid','↗ Build a solid game',()=>setCoachPick(p=>({...p,style:'solid'})))}{chip(coachPick.style==='any','Surprise me',()=>setCoachPick(p=>({...p,style:'any'})))}</div>
                  <button onClick={suggest} style={{marginTop:10,width:'100%',padding:'11px',borderRadius:10,border:'none',background:'var(--ac)',color:'#1a1a1a',fontWeight:800,fontSize:'clamp(11px,2.5vw,13px)',cursor:'pointer'}}>✨ Fill my empty slots ({SLATE-tIdx.length})</button>
                  <button onClick={autoPick} style={{marginTop:7,width:'100%',padding:'10px',borderRadius:10,border:'1px solid rgba(255,255,255,.22)',background:'rgba(255,255,255,.06)',color:'rgba(255,255,255,.85)',fontWeight:800,fontSize:'clamp(10px,2.3vw,12px)',cursor:'pointer'}}>🎲 No preference · you pick for me</button>
                </div>}
                {!slateFull&&tIdx.length>0&&!coachChooserOpen&&<button onClick={()=>setCoachChooserOpen(true)} style={{background:'transparent',border:'none',color:'var(--ac2)',cursor:'pointer',fontSize:'clamp(9.5px,2.1vw,11px)',fontWeight:800,padding:'2px 0 8px',textDecoration:'underline',textUnderlineOffset:3}}>✨ Suggest lessons for my empty slots</button>}
                <button onClick={()=>setCoachBrowseOpen(v=>!v)} style={{width:'100%',textAlign:'left',background:'rgba(0,0,0,.16)',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,padding:'9px 11px',color:'rgba(255,255,255,.75)',fontWeight:800,fontSize:'clamp(10px,2.3vw,12px)',cursor:'pointer'}}>{coachBrowseOpen?'▾':'▸'} Browse all openings & gambits ({elig.length}) · tap one to fill a slot</button>
                {coachBrowseOpen&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(96px,1fr))',gap:6,marginTop:8}}>
                  {elig.map(({o,i})=>{const n=dN(o.name);const m=lnOf(o.name).mastered;const sel=coachTargets.indexOf(o.name)>=0;const can=addable({o,i})&&!slateFull;return(
                    <button key={i} onClick={()=>{if(can)addToSlate(o.name);}} style={{position:'relative',minHeight:48,padding:'6px 7px 14px',borderRadius:12,border:'1px solid '+(sel?'var(--ac)':(m?'#f0c24d':n>0?'rgba(16,185,129,.55)':'rgba(236,90,90,.4)')),background:m?'linear-gradient(150deg,#caa24c,#8a6a26)':n>0?('rgba(16,185,129,'+(0.16+0.06*Math.min(9,n)).toFixed(2)+')'):'rgba(236,90,90,.13)',color:'#fff',cursor:can?'pointer':'default',opacity:(can||sel||n>0)?1:.55,textAlign:'left',boxShadow:sel?'0 0 0 1.5px var(--ac)':'none'}}>
                      <span style={{fontSize:'clamp(8.5px,1.9vw,10px)',fontWeight:800,lineHeight:1.25,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{o.name}</span>
                      <span style={{position:'absolute',right:4,bottom:3,fontSize:'clamp(7.5px,1.7vw,9px)',fontWeight:800,color:m?'#ffe9a8':n>0?'#a7f3d0':'rgba(255,255,255,.55)'}}>{m?'★':n+'/'+LEARN_GOAL}</span>
                      {sel&&<span style={{position:'absolute',left:4,bottom:3,fontSize:9,color:'var(--ac2)',fontWeight:800}}>✓ in slate</span>}
                    </button>);})}
                </div>}
                </div>}
                </>);
              })()}
            </div>
            <div style={{fontSize:'clamp(10px,2.2vw,12px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:.6,textTransform:'uppercase'}}>Learn & practice</div>
            <div style={{display:'flex',flexDirection:'column',gap:9}}>
              {rows.map((r,ri)=>(<button key={ri} onClick={r.on} style={{display:'flex',alignItems:'center',gap:13,width:'100%',padding:'14px 14px',borderRadius:14,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',color:'#fff',cursor:'pointer',textAlign:'left',boxShadow:SHADOW_BOX,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
                <span style={{flexShrink:0,width:42,height:42,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',background:`linear-gradient(150deg,${r.tint[0]},${r.tint[1]})`,fontSize:22,lineHeight:1,boxShadow:`0 4px 11px ${r.tint[1]}66,inset 0 1px 0 rgba(255,255,255,.35)`}}>{r.ic}</span>
                <span style={{flex:1,minWidth:0}}><span style={{display:'block',fontSize:'clamp(14px,3.3vw,16px)',fontWeight:800}}>{r.lab}</span><span style={{display:'block',fontSize:'clamp(10px,2.2vw,12px)',color:'rgba(255,255,255,.55)',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.sub}</span></span>
                <span style={{flexShrink:0,fontSize:20,color:'var(--ac2)',opacity:.6}}>›</span>
              </button>))}
            </div>
          </div>
        </div>);})()}

      {nearbyOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:540,background:baseBg,backgroundImage:appBgImg,display:'flex',flexDirection:'column',alignItems:'center',padding:`max(24px,env(safe-area-inset-top,0px)) 18px max(20px,env(safe-area-inset-bottom,0px))`,overflowY:'auto',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
          <div style={{width:'100%',maxWidth:460,display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>setNearbyOpen(false)} style={{minWidth:36,height:32,borderRadius:12,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.18)',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:14,padding:'0 11px'}}>‹ Back</button>
              <div style={{fontFamily:headFont,fontSize:'clamp(18px,4.4vw,24px)',fontWeight:800,color:'#fff'}}>📍 Play nearby</div>
            </div>
            {nearbyMsg&&<div style={{fontSize:'clamp(11px,2.5vw,13px)',color:'var(--ac2)',background:'rgba(var(--acr),.12)',border:'1px solid rgba(var(--acr),.3)',borderRadius:10,padding:'9px 12px'}}>{nearbyMsg}</div>}
            {!nearbyGeo?(<>
              <div style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.14)',borderRadius:14,padding:'14px 13px',lineHeight:1.5,fontSize:'clamp(11px,2.5vw,13px)',color:'rgba(255,255,255,.8)'}}>Find other players in your area and challenge them. You choose to be visible, and only an approximate area is shared (never your exact location). You can turn this off any time.</div>
              <button onClick={nearbyJoin} disabled={nearbyBusy} style={{width:'100%',padding:'14px',borderRadius:13,border:'none',background:'var(--ac)',color:'#15210a',fontWeight:800,fontSize:'clamp(14px,3.4vw,17px)',cursor:nearbyBusy?'default':'pointer',opacity:nearbyBusy?.6:1}}>{nearbyBusy?'Finding players…':'📍 Find players near me'}</button>
              <div style={{display:'flex',alignItems:'center',gap:8,color:'rgba(255,255,255,.4)',fontSize:'clamp(9px,2vw,11px)'}}><div style={{flex:1,height:1,background:'rgba(255,255,255,.12)'}}/>or use your ZIP or postcode<div style={{flex:1,height:1,background:'rgba(255,255,255,.12)'}}/></div>
              <div style={{display:'flex',gap:8}}>
                <input value={nearbyZip} onChange={e=>setNearbyZip(e.target.value)} placeholder="ZIP or postcode" style={{flex:1,minWidth:0,padding:'10px 11px',borderRadius:12,background:'rgba(0,0,0,.25)',border:'1px solid rgba(255,255,255,.16)',color:'#fff',fontSize:'clamp(11px,2.4vw,13px)'}}/>
                <button onClick={nearbyJoinZip} disabled={nearbyBusy} style={{flexShrink:0,padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.2)',color:'#fff',fontWeight:800,fontSize:'clamp(11px,2.5vw,13px)',cursor:'pointer'}}>Use</button>
              </div>
            </>):(<>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.3)',borderRadius:12,padding:'10px 12px'}}>
                <span style={{fontSize:'clamp(10px,2.3vw,12px)',color:'#6ee7b7',fontWeight:700}}>You are visible to nearby players</span>
                <button onClick={nearbyLeave} style={{flexShrink:0,padding:'6px 11px',borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.18)',color:'rgba(255,255,255,.75)',fontWeight:700,fontSize:'clamp(9px,2vw,11px)',cursor:'pointer'}}>Stop</button>
              </div>
              <div>
                <div style={{fontSize:'clamp(10px,2.2vw,12px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:.6,textTransform:'uppercase',marginBottom:8}}>Players near you</div>
                {(!nearbyData||nearbyData.length===0)?(<div style={{fontSize:'clamp(11px,2.5vw,13px)',color:'rgba(255,255,255,.58)',lineHeight:1.5,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'14px'}}>No one else is here yet. Check back later, or tell a friend in your area to turn on Play nearby too.</div>):(
                  <div style={{display:'flex',flexDirection:'column',gap:9}}>
                    {nearbyData.map(p=>(<div key={p.uid} style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,padding:'10px 12px'}}>
                      <span style={{flexShrink:0,width:34,height:34,borderRadius:'50%',background:'linear-gradient(150deg,#10b981,#047857)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#fff',fontSize:15}}>{(p.name||'?').slice(0,1).toUpperCase()}</span>
                      <span style={{flex:1,minWidth:0,fontSize:'clamp(12px,2.7vw,14px)',fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name||'Player'}</span>
                      <button onClick={()=>nearbyChallenge(p)} style={{flexShrink:0,padding:'7px 13px',borderRadius:12,background:'var(--ac)',border:'none',color:'#15210a',fontWeight:800,fontSize:'clamp(10px,2.3vw,12px)',cursor:'pointer'}}>Challenge</button>
                    </div>))}
                  </div>
                )}
              </div>
              <div style={{fontSize:'clamp(8.5px,2vw,10.5px)',color:'rgba(255,255,255,.4)',lineHeight:1.4}}>Challenging creates an online game and gives you an invite code to send. Direct nearby invites are coming next.</div>
            </>)}
          </div>
        </div>)}
      {friendsOpen&&(()=>{const myId=(window.CTCloud&&window.CTCloud.friendId&&window.CTCloud.friendId())||(cloudUser&&cloudUser.uid)||'';return(
        <div style={{position:'fixed',inset:0,zIndex:540,background:baseBg,backgroundImage:appBgImg,display:'flex',flexDirection:'column',alignItems:'center',padding:`max(24px,env(safe-area-inset-top,0px)) 18px max(20px,env(safe-area-inset-bottom,0px))`,overflowY:'auto',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
          <div style={{width:'100%',maxWidth:460,display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>setFriendsOpen(false)} style={{minWidth:36,height:32,borderRadius:12,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.18)',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:14,padding:'0 11px'}}>‹ Back</button>
              <div style={{fontFamily:headFont,fontSize:'clamp(18px,4.4vw,24px)',fontWeight:800,color:'#fff'}}>👥 Friends</div>
            </div>
            {friendMsg&&<div style={{fontSize:'clamp(11px,2.5vw,13px)',color:'var(--ac2)',background:'rgba(var(--acr),.12)',border:'1px solid rgba(var(--acr),.3)',borderRadius:10,padding:'9px 12px'}}>{friendMsg}</div>}
            <div style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.14)',borderRadius:14,padding:'12px 13px'}}>
              <div style={{fontSize:'clamp(9px,2vw,11px)',color:'var(--ac2)',fontWeight:800,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Your ID</div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{flex:1,minWidth:0,fontFamily:'ui-monospace,Menlo,Consolas,monospace',fontSize:'clamp(10px,2.2vw,12px)',color:'rgba(255,255,255,.85)',wordBreak:'break-all',background:'rgba(0,0,0,.25)',borderRadius:8,padding:'8px 10px'}}>{myId}</div>
                <button onClick={()=>{try{navigator.clipboard.writeText(myId);setFriendMsg("Your ID is copied. Send it to a friend so they can add you.");}catch(e){setFriendMsg("Select and copy your ID above.");}}} style={{flexShrink:0,padding:'9px 12px',borderRadius:12,background:'var(--ac)',border:'none',color:'#191919',fontWeight:800,fontSize:'clamp(10px,2.3vw,12px)',cursor:'pointer'}}>Copy</button>
              </div>
              <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.5)',marginTop:6,lineHeight:1.4}}>Share this so a friend can add you. You both have to accept.</div>
            </div>
            <div style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.14)',borderRadius:14,padding:'12px 13px'}}>
              <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.6)',fontWeight:700,letterSpacing:.5,textTransform:'uppercase',marginBottom:7}}>Add a friend by ID</div>
              <div style={{display:'flex',gap:8}}>
                <input value={friendIdInput} onChange={e=>setFriendIdInput(e.target.value)} placeholder="Paste their ID" style={{flex:1,minWidth:0,padding:'10px 11px',borderRadius:12,background:'rgba(0,0,0,.25)',border:'1px solid rgba(255,255,255,.16)',color:'#fff',fontSize:'clamp(11px,2.4vw,13px)',fontFamily:'ui-monospace,Menlo,Consolas,monospace'}}/>
                <button onClick={async()=>{const id=friendIdInput.trim();if(!id){setFriendMsg("Paste a friend ID first.");return;}setFriendMsg("Sending request...");try{await window.CTCloud.friendRequest(id);setFriendIdInput('');setFriendMsg("Request sent. They need to accept it.");}catch(e){const m=e&&e.message;setFriendMsg(m==='self'?"That is your own ID.":m==='pending'?"You already have a pending request to them.":m==='already'?"You are already friends.":m==='signin'?"Sign in first.":"Could not send the request. Check the ID and your connection.");}}} style={{flexShrink:0,padding:'10px 14px',borderRadius:12,background:'var(--ac)',border:'none',color:'#191919',fontWeight:800,fontSize:'clamp(11px,2.5vw,13px)',cursor:'pointer'}}>Add</button>
              </div>
            </div>
            {friendsData.incoming&&friendsData.incoming.length>0&&(<div>
              <div style={{fontSize:'clamp(10px,2.2vw,12px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:.6,textTransform:'uppercase',marginBottom:8}}>Requests</div>
              <div style={{display:'flex',flexDirection:'column',gap:9}}>
                {friendsData.incoming.map(r=>(<div key={r.id} style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,padding:'10px 12px'}}>
                  <span style={{flex:1,minWidth:0,fontSize:'clamp(12px,2.7vw,14px)',fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.fromName}</span>
                  <button onClick={async()=>{setFriendMsg('');try{await window.CTCloud.friendAccept(r);setFriendMsg(r.fromName+" is now your friend.");}catch(e){setFriendMsg("Could not accept right now.");}}} style={{flexShrink:0,padding:'7px 13px',borderRadius:12,background:'var(--ac)',border:'none',color:'#191919',fontWeight:800,fontSize:'clamp(10px,2.3vw,12px)',cursor:'pointer'}}>Accept</button>
                  <button onClick={async()=>{try{await window.CTCloud.friendDecline(r.id);}catch(e){}}} style={{flexShrink:0,padding:'7px 11px',borderRadius:12,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.16)',color:'rgba(255,255,255,.7)',fontWeight:700,fontSize:'clamp(10px,2.3vw,12px)',cursor:'pointer'}}>Decline</button>
                </div>))}
              </div>
            </div>)}
            <div>
              <div style={{fontSize:'clamp(10px,2.2vw,12px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:.6,textTransform:'uppercase',marginBottom:8}}>Your friends</div>
              {(!friendsData.friends||friendsData.friends.length===0)?(<div style={{fontSize:'clamp(11px,2.5vw,13px)',color:'rgba(255,255,255,.58)',lineHeight:1.5,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'14px'}}>No friends yet. Share your ID, or paste a friend ID above to send a request.</div>):(
                <div style={{display:'flex',flexDirection:'column',gap:9}}>
                  {friendsData.friends.map(f=>(<div key={f.id} style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,padding:'10px 12px'}}>
                    <span style={{flexShrink:0,width:34,height:34,borderRadius:'50%',background:'linear-gradient(150deg,#0ea5e9,#0369a1)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#fff',fontSize:15}}>{(f.name||'?').slice(0,1).toUpperCase()}</span>
                    <span style={{flex:1,minWidth:0,fontSize:'clamp(12px,2.7vw,14px)',fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.name}</span>
                    <button onClick={()=>{setFriendsOpen(false);setHomeScreen(false);setMode('play');setOpponent('online');setOnlineGame(null);setMyColor(null);setOnlineErr('');setPlaySetup(false);setOnlineInfo("Game created. Send "+f.name+" your invite code to start.");setTimeout(function(){try{onlineCreate('w');}catch(e){}},0);}} style={{flexShrink:0,padding:'7px 13px',borderRadius:12,background:'var(--ac)',border:'none',color:'#191919',fontWeight:800,fontSize:'clamp(10px,2.3vw,12px)',cursor:'pointer'}}>Challenge</button>
                    <button onClick={async()=>{try{await window.CTCloud.friendRemove(f.id);setFriendMsg(f.name+" removed.");}catch(e){}}} style={{flexShrink:0,width:30,height:30,borderRadius:12,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.16)',color:'rgba(255,255,255,.6)',fontWeight:700,fontSize:14,cursor:'pointer'}}>✕</button>
                  </div>))}
                </div>
              )}
            </div>
          </div>
        </div>);})()}
      {achvOpen&&(()=>{const earned=new Set(achv||[]);return(
        <div style={{position:'fixed',inset:0,zIndex:545,background:baseBg,backgroundImage:appBgImg,display:'flex',flexDirection:'column',alignItems:'center',padding:`max(24px,env(safe-area-inset-top,0px)) 18px max(20px,env(safe-area-inset-bottom,0px))`,overflowY:'auto',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
          <div style={{width:'100%',maxWidth:460,display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>setAchvOpen(false)} style={{minWidth:36,height:32,borderRadius:12,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.18)',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:14,padding:'0 11px'}}>‹ Back</button>
            </div>
            <div><div style={{fontFamily:headFont,fontSize:'clamp(20px,5vw,26px)',fontWeight:800,color:'#fff',letterSpacing:.3}}>🏅 Achievements</div><div style={{fontSize:'clamp(11px,2.5vw,13px)',color:'rgba(255,255,255,.6)',marginTop:2}}>{earned.size} of {ACHV.length} unlocked</div></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {ACHV.map(a=>{const got=earned.has(a.id);return(<div key={a.id} style={{borderRadius:14,padding:'14px 12px',textAlign:'center',background:got?'linear-gradient(150deg,rgba(240,212,138,.22),rgba(202,162,76,.08))':'rgba(255,255,255,.04)',border:got?'1px solid rgba(240,212,138,.5)':'1px solid rgba(255,255,255,.1)',boxShadow:got?SHADOW_BOX:'none',opacity:got?1:.62}}>
                <div style={{fontSize:30,lineHeight:1,marginBottom:7,filter:got?'none':'grayscale(1)'}}>{got?a.ic:'🔒'}</div>
                <div style={{fontSize:'clamp(13px,3vw,15px)',fontWeight:800,color:got?'#f0d48a':'rgba(255,255,255,.8)'}}>{a.name}</div>
                <div style={{fontSize:'clamp(10.5px,2.4vw,12px)',color:'rgba(255,255,255,.55)',marginTop:3,lineHeight:1.3}}>{a.desc}</div>
              </div>);})}
            </div>
          </div>
        </div>);})()}

      {false&&(<div style={{position:'fixed',inset:0,zIndex:520,background:baseBg,backgroundImage:appBgImg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:`max(28px,env(safe-area-inset-top,0px)) 22px max(20px,env(safe-area-inset-bottom,0px))`,overflowY:'auto',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        <div style={{width:'100%',maxWidth:420,textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{position:'relative',width:96,height:96,borderRadius:26,display:'flex',alignItems:'center',justifyContent:'center',fontSize:52,background:'linear-gradient(150deg,#f59e0b,#b45309)',boxShadow:'0 6px 0 rgba(0,0,0,.28),0 14px 26px rgba(180,83,9,.5),inset 0 2px 0 rgba(255,255,255,.45)'}}>🧩<span style={{position:'absolute',right:-6,bottom:-6,width:34,height:34,borderRadius:'50%',background:'#191622',border:'2px solid #f0d48a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>🔒</span></div>
          <div style={{fontFamily:"var(--head)",fontSize:'clamp(24px,6vw,32px)',fontWeight:700,color:'#fff',marginTop:18}}>Puzzles is a Pro feature</div>
          <div style={{fontSize:'clamp(12px,2.8vw,14px)',color:'rgba(255,255,255,.6)',lineHeight:1.5,marginTop:8,maxWidth:340}}>Unlock 890+ tactical puzzles and the full training roadmap with Chess Trainer Pro.</div>
          <button onClick={()=>{setUpgradeMsg('');setAcctOpen(true);}} style={{marginTop:22,padding:'13px 24px',borderRadius:13,background:'linear-gradient(150deg,#f0d48a,#caa24c)',border:'1px solid #f0d48a',color:'#2a2010',cursor:'pointer',fontWeight:800,fontSize:'clamp(13px,3vw,15px)',boxShadow:'0 4px 0 rgba(0,0,0,.25),0 9px 18px rgba(201,162,76,.45)'}}>⚜️ Upgrade to Pro</button>
          <button onClick={()=>setHomeScreen(true)} style={{marginTop:12,padding:'9px 18px',borderRadius:11,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.18)',color:'rgba(255,255,255,.78)',cursor:'pointer',fontWeight:700,fontSize:'clamp(11px,2.5vw,13px)'}}>‹ Back to Home</button>
        </div>
      </div>)}
      {mode==='play'&&playSetup&&!homeScreen&&(<div style={{position:'fixed',inset:0,zIndex:520,background:baseBg,backgroundImage:appBgImg,display:'flex',flexDirection:'column',alignItems:'center',padding:`max(20px,env(safe-area-inset-top,0px)) 16px max(16px,env(safe-area-inset-bottom,0px))`,overflowY:'auto',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        <div className="scroll" style={{width:'100%',maxWidth:420,display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <button onClick={()=>{setPlaySetup(false);setHomeScreen(true);}} style={{minWidth:36,height:32,borderRadius:12,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.18)',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:15,padding:'0 11px'}}>‹ Home</button>
            <div style={{fontFamily:"var(--head)",fontSize:'clamp(18px,5vw,24px)',color:'var(--ac)',letterSpacing:1}}>New Game</div>
            <div style={{minWidth:36}}/>
          </div>
          {setupFromFEN&&(<div style={{padding:'10px 13px',borderRadius:12,background:'rgba(var(--acr),.12)',border:'1px solid rgba(var(--acr),.3)',fontSize:'clamp(10px,2.4vw,12.5px)',color:'var(--ac2)',lineHeight:1.45}}>♟ Continuing from your reviewed position. You'll play <b>{pColor==='w'?'White':'Black'}</b> (the side to move) — switch the color below if you'd rather take the other side.</div>)}
          <div>
            <button onClick={()=>{ setScanMsg(''); if(!cloudUser){ setUpgradeMsg('Sign in to scan a board.'); setAcctOpen(true); return; } if(scanInputRef.current) scanInputRef.current.click(); }} disabled={scanBusy} style={{width:'100%',padding:'13px',borderRadius:13,border:'1px solid rgba(255,255,255,.18)',background:'rgba(255,255,255,.06)',color:'#fff',fontWeight:800,fontSize:'clamp(13px,3vw,15px)',cursor:scanBusy?'default':'pointer',opacity:scanBusy?.6:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{scanBusy?'Reading the board…':'📷 Scan a board from a photo'}</button>
            <input ref={scanInputRef} type="file" accept="image/*" capture="environment" onChange={e=>{const f=e.target.files&&e.target.files[0];e.target.value='';scanBoardFile(f);}} style={{display:'none'}}/>
            {scanMsg&&<div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'var(--ac2)',marginTop:7,lineHeight:1.45}}>{scanMsg}</div>}
            <div style={{fontSize:'clamp(8.5px,2vw,10.5px)',color:'rgba(255,255,255,.4)',marginTop:5,lineHeight:1.4}}>Point straight at a real or on-screen board with the whole board in frame. We read the position so you can play it out or analyze it.</div>
          </div>

          <div>
            <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Opponent</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[{k:'online',ic:'online',t:'Online'},{k:'computer',ic:'computer',t:'Computer'},{k:'human',ic:'human',t:'Pass & Play'}].map(o=>{const on=opponent===o.k;const OPPT={computer:['#5b8def','#2f6fd0'],human:['#22c55e','#15803d'],online:['#a855f7','#7c3aed']};const tint=(SK.tints&&(o.k==='computer'?SK.tints.analyze:o.k==='human'?SK.tints.learn:SK.tints.play))||OPPT[o.k];return(
                <button key={o.k} onClick={()=>{setSoonMsg('');if(o.k==='online'){setOpponent('online');setOnlineGame(null);setMyColor(null);setOnlineErr('');setOnlineInfo('');}else setOpponent(o.k);}} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'14px 6px',borderRadius:14,cursor:'pointer',background:on?'rgba(var(--acr),.2)':'rgba(255,255,255,.05)',border:on?'1.5px solid var(--ac)':'1.5px solid rgba(255,255,255,.14)',color:on?'var(--ac2)':'rgba(255,255,255,.78)'}}>
                  <span style={{width:46,height:46,borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center',background:`linear-gradient(150deg,${tint[0]},${tint[1]})`,border:SK.trim?`1.5px solid ${SK.trim}`:'none',boxShadow:`0 3px 0 rgba(0,0,0,.22),0 6px 12px ${tint[1]}55,inset 0 1px 0 rgba(255,255,255,.4),inset 0 -3px 6px rgba(0,0,0,.22)`}}><AppIcon name={o.ic} size={26} sw={2.2} color="rgba(255,255,255,.96)"/></span>
                  <span style={{fontSize:'clamp(10px,2.4vw,12px)',fontWeight:700}}>{o.t}</span>
                </button>);})}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:8}}>
              {[{k:'friends',ic:'👥',t:'Friends',tint:['#0ea5e9','#0369a1']},{k:'nearby',ic:'📍',t:'Play nearby',tint:['#10b981','#047857']},{k:'tourney',ic:'🏆',t:'Tournaments',tint:['#eab308','#a16207']}].map(o=>(
                <button key={o.k} onClick={()=>{ setSoonMsg(''); if(o.k==='tourney'){ if(!cloudUser){ setUpgradeMsg('Sign in to join tournaments.'); setAcctOpen(true); return; } setTourMsg(''); setTourSel(null); setTourView('list'); setTourOpen(true); return; } if(!cloudUser){ setUpgradeMsg(o.k==='nearby'?'Sign in to play nearby players.':'Sign in to use friends.'); setAcctOpen(true); return; } if(o.k==='friends'){ setFriendMsg(''); setFriendsOpen(true); } else { setNearbyMsg(''); setNearbyOpen(true); } }} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'14px 6px',borderRadius:14,cursor:'pointer',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.14)',color:'rgba(255,255,255,.62)',position:'relative'}}>
                  {o.soon&&<span style={{position:'absolute',top:6,right:8,fontSize:'clamp(7.5px,1.8vw,9px)',fontWeight:800,letterSpacing:.5,color:'#1a1407',background:'var(--ac)',borderRadius:6,padding:'1px 6px'}}>SOON</span>}
                  <span style={{width:46,height:46,borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,background:`linear-gradient(150deg,${o.tint[0]},${o.tint[1]})`,border:SK.trim?`1.5px solid ${SK.trim}`:'none',boxShadow:`0 3px 0 rgba(0,0,0,.22),0 6px 12px ${o.tint[1]}55,inset 0 1px 0 rgba(255,255,255,.4),inset 0 -3px 6px rgba(0,0,0,.22)`,opacity:.92}}>{o.ic}</span>
                  <span style={{fontSize:'clamp(10px,2.4vw,12px)',fontWeight:700}}>{o.t}</span>
                </button>))}
            </div>
            {soonMsg&&<div style={{marginTop:9,textAlign:'center',fontSize:'clamp(10px,2.3vw,12.5px)',color:'var(--ac2)',background:'rgba(var(--acr),.1)',border:'1px solid rgba(var(--acr),.28)',borderRadius:10,padding:'8px 11px',lineHeight:1.4}}>{soonMsg}</div>}
          </div>

          {opponent==='computer'&&(<div>
            <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Choose your opponent</div>
            <div className="scroll" style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:6,marginBottom:14,WebkitOverflowScrolling:'touch'}}>
              {BOTS.map(bt=>{const on=selBot===bt.id;return(
                <button key={bt.id} onClick={()=>{setSelBot(bt.id);setCpuElo(bt.elo);}} style={{flex:'0 0 auto',width:120,display:'flex',flexDirection:'column',alignItems:'center',gap:5,padding:'12px 8px',borderRadius:14,cursor:'pointer',textAlign:'center',background:on?'rgba(var(--acr),.18)':'rgba(255,255,255,.05)',border:on?'1.5px solid var(--ac)':'1.5px solid rgba(255,255,255,.14)',color:'#fff',boxShadow:on?SHADOW_BOX:'none'}}>
                  <BotFace id={bt.id} size={56}/>
                  <span style={{fontSize:'clamp(12px,3vw,14px)',fontWeight:800}}>{bt.name}</span>
                  <span style={{fontSize:'clamp(9px,2.1vw,11px)',color:on?'var(--ac2)':'rgba(255,255,255,.55)',fontWeight:700}}>≈ {bt.elo} Elo</span>
                  <span style={{fontSize:'clamp(8.5px,2vw,10.5px)',color:'rgba(255,255,255,.55)',lineHeight:1.3}}>{bt.blurb}</span>
                </button>);})}
            </div>
            <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Play as</div>
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              {[{k:'w',t:'White'},{k:'b',t:'Black'}].map(c=>{const on=pColor===c.k;return(
                <button key={c.k} onClick={()=>setPColor(c.k)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px',borderRadius:12,cursor:'pointer',background:on?'rgba(var(--acr),.22)':'rgba(255,255,255,.05)',border:on?'1.5px solid var(--ac)':'1.5px solid rgba(255,255,255,.14)',color:on?'var(--ac2)':'rgba(255,255,255,.7)',fontWeight:700,fontSize:'clamp(12px,2.7vw,14px)'}}><Piece t="k" color={c.k} sz={24}/>{c.t}</button>);})}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:4}}>
              <span style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>Strength</span>
              <span style={{fontSize:'clamp(11px,2.6vw,13px)',color:'var(--ac2)',fontWeight:800}}>≈ {cpuElo} Elo</span>
            </div>
            <input type="range" min={ELO_MIN} max={ELO_MAX} step={25} value={cpuElo} onChange={e=>{const v=+e.target.value;setCpuElo(v);setSelBot(botForElo(v)?botForElo(v).id:null);}} style={{width:'100%',accentColor:TH.accent,cursor:'pointer'}}/>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:8,color:'rgba(255,255,255,.4)'}}><span>Beginner</span><span>Club</span><span>Strong</span></div>
          </div>)}

          {opponent!=='online'&&(<div>
            <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>⏱ Time control</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <span style={pill(!timeCtrl)} onClick={()=>{timeCtrlRef.current=null;setTimeCtrl(null);}}>No clock</span>
              {TIME_CONTROLS.map(tc=>(<span key={tc.label} style={pill(!!timeCtrl&&timeCtrl.label===tc.label)} onClick={()=>{timeCtrlRef.current=tc;setTimeCtrl(tc);}}>{tc.label}</span>))}
            </div>
            <div style={{fontSize:'clamp(8px,1.8vw,10px)',color:'rgba(255,255,255,.4)',marginTop:6}}>minutes + increment per move — e.g. 3+1 means 3 minutes, +1 second each move</div>
          </div>)}

          {opponent==='online'&&(<div>
            <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>⏳ Time per move</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <span style={pill(!timeCtrl)} onClick={()=>{timeCtrlRef.current=null;setTimeCtrl(null);}}>No limit</span>
              {CORR_CONTROLS.map(c=>{const o={label:c.label,kind:'corr',days:c.days};const on=!!timeCtrl&&timeCtrl.kind==='corr'&&timeCtrl.days===c.days;return(<span key={c.label} style={pill(on)} onClick={()=>{timeCtrlRef.current=o;setTimeCtrl(o);}}>{c.label}</span>);})}
            </div>
            <div style={{fontSize:'clamp(8px,1.8vw,10px)',color:'rgba(255,255,255,.58)',marginTop:6,lineHeight:1.5}}>Multi-day game: you and your friend each have this long to reply to every move. Play whenever you like — the game waits for you and shows up under “Your games” when you sign in on any device.</div>
            <div style={{marginTop:9,padding:'12px 14px',borderRadius:12,background:'rgba(110,168,254,.1)',border:'1px solid rgba(110,168,254,.3)',fontSize:'clamp(10.5px,2.4vw,12.5px)',color:'#cfe0ff',lineHeight:1.5}}>You'll create a game or join a friend's code on the next screen. Sign in with Google is required. <span style={{color:'rgba(255,255,255,.5)'}}>(Live ticking clocks for online are still coming; the day limits above work now.)</span></div>
          </div>)}

          <button onClick={()=>{setPlaySetup(false);if(opponent!=='online')fullReset(setupFromFEN?fromFEN(setupFromFEN):undefined);setSetupFromFEN(null);}} style={{marginTop:4,padding:'15px',borderRadius:14,border:'none',background:'var(--ac)',color:'#191919',fontWeight:800,fontSize:'clamp(14px,3.4vw,17px)',cursor:'pointer',boxShadow:`0 8px 24px rgba(${TH.rgb},.35)`}}>{opponent==='online'?'Continue →':(setupFromFEN?'▶ Play this position':'▶ Start game')}</button>
          <div style={{textAlign:'center',fontSize:'clamp(9px,2.1vw,11px)',color:'rgba(255,255,255,.4)',marginTop:-6}}>{opponent==='computer'?`vs ${selBot&&botById(selBot)?botById(selBot).name:'Computer'} · ${pColor==='w'?'White':'Black'} · ${timeCtrl?timeCtrl.label:'No clock'}`:opponent==='human'?`Pass & play on one device · ${timeCtrl?timeCtrl.label:'No clock'}`:'Online · play a friend by invite code'}</div>
          {BUILD_INFO&&<div style={{textAlign:'center',fontSize:11,color:'rgba(255,255,255,.3)',letterSpacing:.5,fontFamily:'ui-monospace,Menlo,Consolas,monospace',marginTop:12}}>Build {BUILD_INFO}</div>}
        </div>
      </div>)}

      {!pzLow&&!wide&&(<div style={{display:'flex',alignItems:'center',justifyContent:'flex-start',gap:9,marginBottom:8,width:'100%',maxWidth:boardPx+44,position:'relative',paddingLeft:2}}>
        <div onClick={()=>setHomeScreen(true)} title="Home" style={{fontFamily:"var(--head)",fontSize:'clamp(18px,5vw,28px)',color:'var(--ac)',letterSpacing:2,textShadow:'0 2px 12px rgba(var(--acr),.4)',cursor:'pointer',whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:'0.16em',maxWidth:'calc(100% - 92px)',overflow:'hidden'}}>{(()=>{const _hT=homeScreen?null:((mode==='learn'&&openIdx!==null&&LIB[openIdx])?LIB[openIdx].name:((mode==='play'&&!playSetup)?(opponent==='computer'?'Play':opponent==='online'?'Online game':opponent==='local'?'Pass & play':'Play'):((mode==='puzzle')?'Puzzles':((mode==='analyze')?'Game review':null))));return _hT?(<span style={{fontSize:'clamp(14px,3.9vw,19px)',fontWeight:800,color:'#fff',letterSpacing:.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'}}>{_hT}</span>):(<><QueenGlyph idp="s" style={{width:'1.15em',height:'1.15em',flexShrink:0,filter:'drop-shadow(0 2px 4px rgba(0,0,0,.5))'}}/>CHESS TRAINER</>);})()}</div>
        <button onClick={()=>setHomeScreen(true)} title="Home" style={{position:'absolute',right:46,top:'50%',transform:'translateY(-50%)',flexShrink:0,minWidth:38,height:30,borderRadius:8,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',cursor:'pointer',fontSize:15,lineHeight:1,padding:'0 9px'}}>🏠</button>
        <button onClick={()=>setMenuOpen(true)} title="Menu &amp; settings" style={{position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',flexShrink:0,minWidth:38,height:30,borderRadius:8,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',cursor:'pointer',fontSize:16,lineHeight:1,padding:'0 9px'}}>☰</button>
      </div>)}
      {!pzLow&&wide&&(<button onClick={()=>setHomeScreen(true)} title="Home" style={{position:'fixed',top:'calc(env(safe-area-inset-top,0px) + 6px)',right:'calc(env(safe-area-inset-right,0px) + 58px)',zIndex:60,minWidth:40,height:32,borderRadius:8,background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.2)',color:'#fff',cursor:'pointer',fontSize:16,lineHeight:1,padding:'0 10px'}}>🏠</button>)}
      {!pzLow&&wide&&(<button onClick={()=>setMenuOpen(true)} title="Menu &amp; settings" style={{position:'fixed',top:'calc(env(safe-area-inset-top,0px) + 6px)',right:'calc(env(safe-area-inset-right,0px) + 10px)',zIndex:60,minWidth:40,height:32,borderRadius:8,background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.2)',color:'#fff',cursor:'pointer',fontSize:17,lineHeight:1,padding:'0 10px'}}>☰</button>)}
      {acctOpen&&(<div onClick={()=>setAcctOpen(false)} style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(0,0,0,.62)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:430,background:'#191622',borderRadius:18,border:'1px solid rgba(255,255,255,.12)',padding:'18px 18px 20px',boxShadow:SHADOW_CARD,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <span style={{fontFamily:"var(--head)",fontSize:21,fontWeight:700,color:'var(--ac2)'}}>Account</span>
            <button onClick={()=>setAcctOpen(false)} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',cursor:'pointer',fontSize:15,lineHeight:1}}>✕</button>
          </div>
          {cloudUser?(
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'4px 2px 14px'}}>
              {cloudUser.photo?<img src={cloudUser.photo} alt="" referrerPolicy="no-referrer" style={{width:52,height:52,borderRadius:'50%',flexShrink:0,border:'2px solid rgba(var(--acr),.5)'}}/>:<span style={{fontSize:40,flexShrink:0}}>👤</span>}
              <div style={{minWidth:0}}>
                <div style={{fontWeight:800,fontSize:'clamp(15px,3.4vw,18px)',color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cloudUser.name||'Signed in'}</div>
                {cloudUser.email&&<div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'rgba(255,255,255,.55)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cloudUser.email}</div>}
                <div style={{fontSize:'clamp(9px,2vw,11px)',color:'var(--ac2)',marginTop:2}}>☁ Synced across your devices</div>
              </div>
            </div>
          ):(
            <div style={{padding:'2px 2px 14px'}}>
              <div style={{fontSize:'clamp(12px,2.7vw,14px)',color:'rgba(255,255,255,.8)',lineHeight:1.5,marginBottom:12}}>Sign in to sync your progress, Elo, themes and lessons across devices, and to unlock Pro.</div>
              <button onClick={cloudSignIn} disabled={!cloudAvail} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:9,width:'100%',padding:'12px 14px',borderRadius:12,background:cloudAvail?'#fff':'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.18)',color:cloudAvail?'#222':'rgba(255,255,255,.4)',cursor:cloudAvail?'pointer':'default',fontWeight:700,fontSize:'clamp(12px,2.7vw,14px)'}}><span style={{fontWeight:800,color:cloudAvail?'#4285F4':'inherit'}}>G</span>{cloudAvail?'Sign in with Google':'Sign-in unavailable here'}</button>
              {(cloudErr||!cloudAvail)&&<div style={{fontSize:'clamp(9px,2vw,11px)',color:cloudErr?'#ec9a90':'rgba(255,255,255,.58)',marginTop:6,lineHeight:1.4}}>{cloudErr||'Open the published app to sign in.'}</div>}
            </div>
          )}
          <div style={{borderRadius:14,padding:'14px 14px 15px',background:'linear-gradient(150deg,rgba(201,162,76,.16),rgba(201,162,76,.05))',border:'1px solid rgba(201,162,76,.4)',boxShadow:SHADOW_BOX}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:9}}><span style={{fontSize:20}}>⚜️</span><span style={{fontFamily:"var(--head)",fontSize:'clamp(16px,3.6vw,19px)',fontWeight:700,color:'#f0d48a'}}>Chess Trainer Pro</span>{isPro&&<span style={{marginLeft:'auto',fontSize:'clamp(9px,2vw,11px)',fontWeight:800,color:'#2a2010',background:'#f0d48a',borderRadius:20,padding:'2px 10px'}}>ACTIVE</span>}</div>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
              {[['Your Coach and full mastery plan','🧠'],['Every board theme, including Medieval','⚜️'],['Priority access to new features','✨']].map(([f,ic],i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:7,fontSize:'clamp(11px,2.5vw,13px)',color:'rgba(255,255,255,.86)'}}><span>{ic}</span><span>{f}</span></div>
              ))}
            </div>
            {isPro?(
              <><button onClick={async()=>{setUpgradeMsg('Opening your subscription…');try{await window.CTCloud.proPortal();}catch(e){setUpgradeMsg('Could not open the subscription portal. Please try again.');}}} style={{width:'100%',padding:'10px 8px',borderRadius:11,background:'rgba(255,255,255,.06)',border:'1px solid rgba(240,212,138,.4)',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:'clamp(11px,2.5vw,13px)'}}>⚙ Manage subscription</button>
              {testPro&&<button onClick={()=>{setTestPro(false);setUpgradeMsg('Test Pro turned off.');}} style={{marginTop:8,width:'100%',padding:'8px',borderRadius:11,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.16)',color:'rgba(255,255,255,.6)',cursor:'pointer',fontWeight:600,fontSize:'clamp(10px,2.3vw,12px)'}}>Turn off Pro (test)</button>}</>
            ):(<>
              <div style={{display:'flex',gap:8}}>
                <button onClick={async()=>{if(!cloudUser){setUpgradeMsg('Sign in first to upgrade.');return;}setUpgradeMsg('Opening secure checkout…');try{await window.CTCloud.proCheckout(STRIPE_PRICE_MONTHLY);}catch(e){setUpgradeMsg(e&&e.message==='timeout'?'Checkout is taking a moment. Tap the plan again in a few seconds.':'Could not start checkout. Please try again.');}}} style={{flex:1,padding:'10px 8px',borderRadius:11,background:'rgba(255,255,255,.06)',border:'1px solid rgba(240,212,138,.4)',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:'clamp(11px,2.5vw,13px)',display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>Monthly<span style={{fontSize:'.8em',color:'rgba(255,255,255,.5)',fontWeight:600}}>billed monthly</span></button>
                <button onClick={async()=>{if(!cloudUser){setUpgradeMsg('Sign in first to upgrade.');return;}setUpgradeMsg('Opening secure checkout…');try{await window.CTCloud.proCheckout(STRIPE_PRICE_YEARLY);}catch(e){setUpgradeMsg(e&&e.message==='timeout'?'Checkout is taking a moment. Tap the plan again in a few seconds.':'Could not start checkout. Please try again.');}}} style={{flex:1,padding:'10px 8px',borderRadius:11,background:'linear-gradient(150deg,#f0d48a,#caa24c)',border:'1px solid #f0d48a',color:'#2a2010',cursor:'pointer',fontWeight:800,fontSize:'clamp(11px,2.5vw,13px)',display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>Annual<span style={{fontSize:'.8em',color:'rgba(40,30,10,.7)',fontWeight:700}}>best value</span></button>
              </div>
              <button onClick={()=>{setTestPro(true);setUpgradeMsg('Pro unlocked (test mode). Puzzles are now open.');}} style={{marginTop:8,width:'100%',padding:'9px 8px',borderRadius:11,background:'rgba(110,200,120,.14)',border:'1px dashed rgba(110,200,120,.5)',color:'#9fe0a8',cursor:'pointer',fontWeight:700,fontSize:'clamp(10px,2.3vw,12px)'}}>🔓 Unlock Pro (test mode)</button>
            </>)}
            {upgradeMsg&&<div style={{marginTop:10,fontSize:'clamp(10px,2.3vw,12px)',color:'#f0d48a',lineHeight:1.45,textAlign:'center'}}>{upgradeMsg}</div>}
          </div>
          {cloudUser&&<button onClick={()=>{cloudSignOut();setAcctOpen(false);}} style={{marginTop:14,width:'100%',padding:'10px 12px',borderRadius:11,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.18)',color:'rgba(255,255,255,.8)',cursor:'pointer',fontWeight:700,fontSize:'clamp(11px,2.5vw,13px)'}}>Sign out</button>}
        </div>
      </div>)}
      {fbOpen&&(<div onClick={()=>setFbOpen(false)} style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(0,0,0,.62)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:400,background:'#191622',borderRadius:18,border:'1px solid rgba(255,255,255,.12)',padding:'18px',boxShadow:SHADOW_CARD,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}><span style={{fontFamily:"var(--head)",fontSize:19,fontWeight:700,color:'var(--ac2)'}}>Send feedback</span><button onClick={()=>setFbOpen(false)} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',cursor:'pointer',fontSize:15}}>✕</button></div>
          {fbSent?(<div style={{padding:'20px 6px',textAlign:'center',color:'var(--ac2)',fontWeight:700,fontSize:'clamp(13px,3vw,15px)'}}>{fbCopied?'Copied! Now paste it to me in the chat to send it.':'Saved. Could not copy automatically, so please screenshot this to share.'}</div>):(<>
            <div style={{fontSize:'clamp(11px,2.5vw,13px)',color:'rgba(255,255,255,.7)',lineHeight:1.5,marginBottom:10}}>Tell us what you love, what's confusing, or what you'd like to see next. I auto-attach which screen you are on, so you do not need to describe it.</div><div style={{fontSize:'clamp(10px,2.2vw,12px)',color:'var(--ac2)',fontFamily:'ui-monospace,Menlo,Consolas,monospace',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',borderRadius:9,padding:'7px 9px',marginBottom:10,wordBreak:'break-word',lineHeight:1.4}}>{fbCtx()}</div>
            <textarea value={fbText} onChange={e=>setFbText(e.target.value)} placeholder="Your feedback..." style={{width:'100%',minHeight:96,padding:'10px 11px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',fontSize:14,resize:'vertical',fontFamily:'inherit'}}/>
            <button onClick={sendFbNote} style={{marginTop:11,width:'100%',padding:'12px',borderRadius:12,border:'none',background:'var(--ac)',color:'#191919',fontWeight:800,fontSize:'clamp(13px,3vw,15px)',cursor:'pointer'}}>Copy for Claude</button>
          </>)}
        </div>
      </div>)}
      {themeOpen&&(<div onClick={()=>setThemeOpen(false)} style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(0,0,0,.62)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:430,maxHeight:'82vh',overflowY:'auto',background:'#191622',borderRadius:18,border:'1px solid rgba(255,255,255,.12)',padding:'18px',boxShadow:SHADOW_CARD,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}><span style={{fontFamily:"var(--head)",fontSize:19,fontWeight:700,color:'var(--ac2)'}}>🎨 Board colors</span><button onClick={()=>setThemeOpen(false)} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',cursor:'pointer',fontSize:15}}>✕</button></div>
          <div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'rgba(255,255,255,.55)',marginBottom:11}}>Pick a palette. This is separate from your style.</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
            {THEMES.map((t,i)=>{const on=theme===i;return(<button key={i} onClick={()=>setTheme(i)} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 10px',borderRadius:12,background:on?'rgba(var(--acr),.16)':'rgba(255,255,255,.04)',border:on?'1.5px solid var(--ac)':'1.5px solid rgba(255,255,255,.12)',cursor:'pointer',textAlign:'left'}}>
              <span style={{flexShrink:0,width:30,height:30,borderRadius:7,overflow:'hidden',display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',boxShadow:'inset 0 0 0 1px rgba(0,0,0,.3)'}}><span style={{background:t.light}}/><span style={{background:t.dark}}/><span style={{background:t.dark}}/><span style={{background:t.light}}/></span>
              <span style={{flex:1,minWidth:0}}><span style={{display:'block',fontSize:'clamp(11px,2.5vw,13px)',fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.name}</span><span style={{display:'block',width:'100%',height:5,marginTop:3,borderRadius:3,background:`linear-gradient(90deg,${t.accent},${t.accent2})`}}/></span>
              {on&&<span style={{flexShrink:0,color:'var(--ac)',fontSize:14,fontWeight:800}}>✓</span>}
            </button>);})}
          </div>
        </div>
      </div>)}
      {skinOpen&&(<div onClick={()=>setSkinOpen(false)} style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(0,0,0,.62)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:400,background:'#191622',borderRadius:18,border:'1px solid rgba(255,255,255,.12)',padding:'18px',boxShadow:SHADOW_CARD,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}><span style={{fontFamily:"var(--head)",fontSize:19,fontWeight:700,color:'var(--ac2)'}}>🎭 Style</span><button onClick={()=>setSkinOpen(false)} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',cursor:'pointer',fontSize:15}}>✕</button></div>
          <div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'rgba(255,255,255,.55)',marginBottom:11,lineHeight:1.45}}>Fonts, icons and piece finish. Your colors stay separate.</div>
          <div style={{display:'flex',flexDirection:'column',gap:9}}>
            {SKINS.map((s,i)=>{const on=skin===i;const lock=s.pro&&!isPro;return(<button key={s.key} onClick={()=>{if(lock){setSkinOpen(false);setUpgradeMsg('');setAcctOpen(true);}else setSkin(i);}} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'11px 12px',borderRadius:13,background:on?'rgba(var(--acr),.16)':'rgba(255,255,255,.04)',border:on?'1.5px solid var(--ac)':'1.5px solid rgba(255,255,255,.12)',cursor:'pointer',textAlign:'left',opacity:lock?.85:1}}>
              <span style={{flexShrink:0,display:'flex',gap:4,fontSize:19,lineHeight:1}}><span>{s.icons.learn}</span><span>{s.icons.play}</span></span>
              <span style={{flex:1,minWidth:0}}><span style={{display:'block',fontFamily:s.font,fontSize:'clamp(15px,3.6vw,18px)',fontWeight:700,color:'#fff'}}>{s.name}</span><span style={{display:'block',fontSize:'clamp(10px,2.2vw,12px)',color:'rgba(255,255,255,.6)'}}>{s.blurb}</span></span>
              {lock&&<span style={{flexShrink:0,fontSize:'clamp(9px,2vw,10.5px)',fontWeight:800,color:'#2a2010',background:'#f0d48a',borderRadius:8,padding:'2px 7px'}}>PRO</span>}
              {on&&<span style={{flexShrink:0,color:'var(--ac)',fontSize:16,fontWeight:800}}>✓</span>}
            </button>);})}
          </div>
        </div>
      </div>)}
      {menuOpen&&(<div onClick={()=>setMenuOpen(false)} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:12,overflowY:'auto'}}>
        <div onClick={e=>e.stopPropagation()} className="scroll" style={{marginTop:'5vh',marginBottom:24,width:'100%',maxWidth:380,maxHeight:'88vh',overflowY:'auto',background:'#16161d',border:'1px solid rgba(255,255,255,.14)',borderRadius:16,padding:'12px 14px 18px',boxShadow:'0 24px 70px rgba(0,0,0,.65)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontFamily:"var(--head)",fontSize:'clamp(15px,3.6vw,18px)',color:'var(--ac)',letterSpacing:1}}>Menu</span>
            <button onClick={()=>setMenuOpen(false)} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',cursor:'pointer',fontSize:15,lineHeight:1}}>✕</button>
          </div>
          <div style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',color:'rgba(255,255,255,.58)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',margin:'4px 2px 7px'}}>Account</div>
          {cloudUser?(
            <div style={{display:'flex',alignItems:'center',gap:9,padding:'9px 11px',borderRadius:11,background:'rgba(var(--acr),.12)',border:'1px solid rgba(var(--acr),.3)'}}>
              {cloudUser.photo?<img src={cloudUser.photo} alt="" referrerPolicy="no-referrer" style={{width:32,height:32,borderRadius:'50%',flexShrink:0}}/>:<span style={{fontSize:22,flexShrink:0}}>👤</span>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:'clamp(11px,2.6vw,13px)',color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cloudUser.name||'Signed in'}</div>
                <div style={{fontSize:'clamp(8px,1.9vw,10px)',color:'rgba(255,255,255,.58)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cloudUser.email} · ☁ synced</div>
              </div>
              <button onClick={cloudSignOut} style={{flexShrink:0,padding:'6px 11px',borderRadius:8,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.2)',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:'clamp(10px,2.3vw,12px)',fontWeight:600}}>Sign out</button>
            </div>
          ):(<>
            <button onClick={cloudSignIn} disabled={!cloudAvail} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:9,width:'100%',padding:'11px 13px',borderRadius:11,background:cloudAvail?'#fff':'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.18)',color:cloudAvail?'#222':'rgba(255,255,255,.4)',cursor:cloudAvail?'pointer':'default',fontWeight:700,fontSize:'clamp(12px,2.7vw,14px)'}}><span style={{fontWeight:800,color:cloudAvail?'#4285F4':'inherit'}}>G</span>{cloudAvail?'Sign in with Google':'Sign-in unavailable here'}</button>
            <div style={{fontSize:'clamp(8px,1.85vw,10px)',color:cloudErr?'#ec9a90':'rgba(255,255,255,.42)',marginTop:5,lineHeight:1.4}}>{cloudErr||(cloudAvail?'Sync your Elo, theme & lesson settings across all your devices.':'Open the published app to sign in and sync across devices.')}</div>
          </>)}
          <div style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',color:'rgba(255,255,255,.58)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',margin:'16px 2px 7px'}}>Go to</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {[{k:'learn',ic:'🔭',label:'Discover',on:()=>{setMode('learn');setOpenIdx(null);setOpenMsg('');setLearnPhase('demo');setLearnLine([]);setLearnLabel('');setDemoPly(0);setDemoPlaying(false);setLearnNotes([]);setLearnPlans('');setLearnIdea('');setLearnArrows(null);setLearnVideo(null);setLearnFEN(null);setShowVideo(false);setInfoOpen(true);setLearnCat(null);setLearnGroup(null);fullReset();}},{k:'puzzle',ic:'🧩',label:'Puzzles',on:()=>{setMode('puzzle');setOpenIdx(null);setPzView('roadmap');}},{k:'analyze',ic:'🔍',label:'Review',on:()=>{setMode('analyze');}},{k:'play',ic:'♚',label:'Play',on:()=>{setMode('play');setOpenIdx(null);setSetupFromFEN(null);setPlaySetup(true);}}].map(t=>{const on=mode===t.k;return(
              <button key={t.k} onClick={()=>{t.on();setMenuOpen(false);}} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'11px 13px',borderRadius:11,background:on?'rgba(var(--acr),.2)':'rgba(255,255,255,.05)',border:on?'1.5px solid var(--ac)':'1px solid rgba(255,255,255,.12)',color:on?'var(--ac2)':'#fff',cursor:'pointer',fontFamily:"'Segoe UI',system-ui,sans-serif",fontWeight:700,fontSize:'clamp(12px,2.7vw,14px)',textAlign:'left'}}><span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'1.5em',fontSize:t.big?'1.9em':'1.1em',lineHeight:1,flexShrink:0}}>{t.ic}</span><span>{t.label}</span>{on&&<span style={{marginLeft:'auto',fontSize:'.78em',color:'var(--ac2)'}}>● now</span>}</button>);})}
          </div>
          {mode==='play'&&(<>
            <div style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',color:'rgba(255,255,255,.58)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',margin:'16px 2px 8px'}}>Game setup</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center',marginBottom:8}}>
              <span style={pill(opponent==='human')} onClick={()=>{setOpponent('human');fullReset();}}>👤 vs Human</span>
              <span style={pill(opponent==='computer')} onClick={()=>{setOpponent('computer');fullReset();}}>🤖 vs Computer</span>
              <span style={pill(opponent==='online')} onClick={()=>{setOpponent('online');timeCtrlRef.current=null;setTimeCtrl(null);setOnlineGame(null);setMyColor(null);setOnlineErr('');setOnlineInfo('');setMenuOpen(false);fullReset();}}>🌐 Online</span>
            </div>
            {opponent!=='online'&&(<div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'center',width:'100%'}}>
              <div style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:.6,textTransform:'uppercase'}}>⏱ Time control</div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'center'}}>
                <span style={pill(!timeCtrl)} onClick={()=>{timeCtrlRef.current=null;setTimeCtrl(null);fullReset();}}>No clock</span>
                {TIME_CONTROLS.map(tc=>(<span key={tc.label} style={pill(!!timeCtrl&&timeCtrl.label===tc.label)} onClick={()=>{timeCtrlRef.current=tc;setTimeCtrl(tc);fullReset();}}>{tc.label}</span>))}
              </div>
              <div style={{fontSize:'clamp(7.5px,1.7vw,9.5px)',color:'rgba(255,255,255,.4)',textAlign:'center'}}>minutes + increment in seconds — e.g. 3+1 = 3 min, +1s per move</div>
              {opponent==='human'&&(<>
              <div style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:.6,textTransform:'uppercase',marginTop:2}}>📅 Correspondence <span style={{fontSize:'.82em',color:'rgba(255,255,255,.35)',textTransform:'none',letterSpacing:0,fontWeight:600}}>· online soon</span></div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'center'}}>
                {CORRESPONDENCE.map(c=>(<span key={c.label} title="Coming with online play" style={{...pill(false),opacity:.4,cursor:'not-allowed'}}>🔒 {c.label}</span>))}
              </div>
              <div style={{fontSize:'clamp(7.5px,1.7vw,9.5px)',color:'rgba(255,255,255,.4)',textAlign:'center',maxWidth:300}}>A move every 1–30 days, played from anywhere — unlocks when we put games online.</div>
              </>)}
            </div>)}
            {opponent==='computer'&&(<>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center',marginBottom:8}}>
                <span style={pill(pColor==='w')} onClick={()=>{setPColor('w');fullReset();}}>♔ White</span>
                <span style={pill(pColor==='b')} onClick={()=>{setPColor('b');fullReset();}}>♚ Black</span>
              </div>
              <div style={{width:'100%',maxWidth:300,margin:'0 auto',display:'flex',flexDirection:'column',gap:3,alignItems:'center'}}>
                <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.7)',fontWeight:700}}>Strength ≈ {cpuElo} Elo</div>
                <input type="range" min={ELO_MIN} max={ELO_MAX} step={25} value={cpuElo} onChange={e=>setCpuElo(+e.target.value)} style={{width:'100%',accentColor:TH.accent,cursor:'pointer'}}/>
                <div style={{width:'100%',display:'flex',justifyContent:'space-between',fontSize:8,color:'rgba(255,255,255,.4)',letterSpacing:.3}}><span>Beginner</span><span>Club</span><span>Strong</span></div>
                <div style={{fontSize:'clamp(8px,1.85vw,10px)',color:'rgba(255,255,255,.58)',fontStyle:'italic'}}>Auto-adjusts ±50 Elo after each game</div>
              </div>
            </>)}
          </>)}
          <div style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',color:'rgba(255,255,255,.58)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',margin:'16px 2px 8px'}}>Appearance</div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.6)',fontWeight:700,marginBottom:7}}>Board colors · <span style={{color:'var(--ac2)'}}>{TH.name}</span></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6}}>
              {THEMES.map((t,i)=>(<button key={i} onClick={()=>setTheme(i)} title={t.name} style={{padding:0,borderRadius:8,overflow:'hidden',cursor:'pointer',border:theme===i?'2px solid var(--ac)':'2px solid rgba(255,255,255,.12)',background:'transparent',aspectRatio:'1'}}><span style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',width:'100%',height:'100%'}}><span style={{background:t.light}}/><span style={{background:t.dark}}/><span style={{background:t.dark}}/><span style={{background:t.light}}/></span></button>))}
            </div>
          </div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap',justifyContent:'center'}}>
            <div style={{width:'100%',textAlign:'center',fontSize:'clamp(8px,1.8vw,10px)',color:'rgba(255,255,255,.58)',letterSpacing:1.5,marginBottom:2}}>SKIN</div>
            {SKINS.map((s,i)=>{
              const p=THEMES[s.pal]||THEMES[2];const lock=s.pro&&!isPro;
              return(
              <button key={s.key} onClick={()=>{if(lock){setUpgradeMsg('');setAcctOpen(true);}else setSkin(i);}} style={{display:'flex',alignItems:'center',gap:11,width:'100%',padding:'9px 11px',borderRadius:12,background:skin===i?'rgba(var(--acr),.16)':'rgba(255,255,255,.04)',border:skin===i?'1.5px solid var(--ac)':'1.5px solid rgba(255,255,255,.12)',cursor:'pointer',textAlign:'left',opacity:lock?.85:1}}>
                <span style={{flexShrink:0,width:40,height:40,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',gap:3,fontSize:17,background:'rgba(255,255,255,.07)',boxShadow:'0 1px 6px rgba(0,0,0,.35)',border:s.trim?`1.5px solid ${s.trim}`:'1px solid rgba(255,255,255,.12)'}}>{s.icons.learn}{s.icons.play}</span>
                <span style={{flex:1,minWidth:0}}>
                  <span style={{display:'block',fontSize:'clamp(12px,2.8vw,14px)',fontWeight:800,color:'#fff'}}>{s.name}</span>
                  <span style={{display:'block',fontSize:'clamp(9px,2.1vw,11px)',color:'rgba(255,255,255,.55)'}}>{s.blurb}</span>
                </span>
                {lock?<span style={{flexShrink:0,fontSize:'clamp(9px,2vw,10.5px)',fontWeight:800,color:'#2a2010',background:'#f0d48a',borderRadius:8,padding:'2px 7px'}}>PRO</span>:<span style={{flexShrink:0,fontSize:19}}>{s.icons.play}</span>}
                {skin===i&&<span style={{flexShrink:0,color:'var(--ac2)',fontWeight:800,fontSize:14}}>✓</span>}
              </button>);
            })}
            <div style={{width:'100%',height:1,background:'rgba(255,255,255,.08)',margin:'4px 0 2px'}}/>
            <button onClick={()=>setBoardDepth(d=>!d)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,width:'100%',padding:'7px 11px',borderRadius:12,background:'transparent',border:'1px solid rgba(255,255,255,.12)',cursor:'pointer'}}>
              <span style={{fontSize:'clamp(10px,2.2vw,12px)',color:'rgba(255,255,255,.82)',fontWeight:600}}>Cell depth &amp; texture</span>
              <span style={{fontSize:'clamp(9px,2vw,11px)',fontWeight:800,color:boardDepth?'var(--ac2)':'rgba(255,255,255,.5)',padding:'2px 10px',borderRadius:20,background:boardDepth?'rgba(var(--acr),.2)':'rgba(255,255,255,.08)',border:`1px solid ${boardDepth?'rgba(var(--acr),.45)':'rgba(255,255,255,.15)'}`}}>{boardDepth?'ON':'OFF'}</span>
            </button>
            <button onClick={()=>setHideEval(v=>!v)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,width:'100%',padding:'7px 11px',borderRadius:12,background:'transparent',border:'1px solid rgba(255,255,255,.12)',cursor:'pointer',marginTop:6}}>
              <span style={{fontSize:'clamp(10px,2.2vw,12px)',color:'rgba(255,255,255,.82)',fontWeight:600}}>Evaluation bar</span>
              <span style={{fontSize:'clamp(9px,2vw,11px)',fontWeight:800,color:!hideEval?'var(--ac2)':'rgba(255,255,255,.5)',padding:'2px 10px',borderRadius:20,background:!hideEval?'rgba(var(--acr),.2)':'rgba(255,255,255,.08)',border:`1px solid ${!hideEval?'rgba(var(--acr),.45)':'rgba(255,255,255,.15)'}`}}>{!hideEval?'ON':'OFF'}</span>
            </button>
            <button onClick={()=>setSoundOn(v=>!v)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,width:'100%',padding:'7px 11px',borderRadius:12,background:'transparent',border:'1px solid rgba(255,255,255,.12)',cursor:'pointer',marginTop:6}}>
              <span style={{fontSize:'clamp(10px,2.2vw,12px)',color:'rgba(255,255,255,.82)',fontWeight:600}}>Sound</span>
              <span style={{fontSize:'clamp(9px,2vw,11px)',fontWeight:800,color:soundOn?'var(--ac2)':'rgba(255,255,255,.5)',padding:'2px 10px',borderRadius:20,background:soundOn?'rgba(var(--acr),.2)':'rgba(255,255,255,.08)',border:`1px solid ${soundOn?'rgba(var(--acr),.45)':'rgba(255,255,255,.15)'}`}}>{soundOn?'ON':'OFF'}</span>
            </button>
            <div style={{width:'100%',height:1,background:'rgba(255,255,255,.08)',margin:'4px 0 2px'}}/>
            <div style={{width:'100%'}}>
              <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.6)',fontWeight:700,marginBottom:7}}>Coach look</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}>
                {[{k:'side',t:'Side part'},{k:'recede',t:'Receding'},{k:'bald',t:'Balding'},{k:'comb',t:'Combed back'}].map(c=>{const on=coachStyle===c.k;return(
                  <button key={c.k} onClick={()=>setCoachStyle(c.k)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'8px 4px',borderRadius:11,background:on?'rgba(var(--acr),.16)':'rgba(255,255,255,.04)',border:on?'1.5px solid var(--ac)':'1.5px solid rgba(255,255,255,.12)',cursor:'pointer'}}>
                    <Coach size={40} accent="var(--ac)" style={c.k}/>
                    <span style={{fontSize:'clamp(8px,1.8vw,10px)',fontWeight:700,color:on?'var(--ac2)':'rgba(255,255,255,.6)',textAlign:'center',lineHeight:1.1}}>{c.t}</span>
                  </button>);})}
              </div>
            </div>
          </div>
          <button onClick={()=>{const url=window.location.origin+window.location.pathname;const flash=(m)=>{setShareMsg(m);setTimeout(()=>setShareMsg(''),2600);};const data={title:'Chess Trainer',text:'Learn chess move by move: openings, puzzles, game review, and play vs the computer.',url};if(navigator.share){navigator.share(data).catch(()=>{});}else{try{navigator.clipboard.writeText(url).then(()=>flash('✓ Link copied. Send it to a friend.')).catch(()=>flash('Copy the link from your address bar.'));}catch(e){flash('Copy the link from your address bar.');}}}} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'10px 12px',borderRadius:11,background:'transparent',border:'1px solid rgba(255,255,255,.12)',cursor:'pointer',color:'rgba(255,255,255,.85)',fontWeight:600,fontSize:'clamp(11px,2.5vw,13px)',marginTop:10}}>📣 Share Chess Trainer</button>
          <button onClick={()=>{setFbText('');setFbSent(false);setFbCopied(false);setFbOpen(true);setMenuOpen(false);}} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'10px 12px',borderRadius:11,background:'transparent',border:'1px solid rgba(255,255,255,.12)',cursor:'pointer',color:'rgba(255,255,255,.85)',fontWeight:600,fontSize:'clamp(11px,2.5vw,13px)',marginTop:10}}>💬 Send feedback</button>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px 14px',justifyContent:'center',marginTop:12}}>{[['Privacy','./privacy.html'],['Terms','./terms.html'],['Refunds','./refund.html'],['Delete account','./delete-account.html']].map(([lab,href])=>(<a key={href} href={href} target="_blank" rel="noopener noreferrer" style={{fontSize:'clamp(10px,2.2vw,11.5px)',color:'rgba(255,255,255,.52)',textDecoration:'none'}}>{lab}</a>))}</div>
          {BUILD_INFO&&<div style={{textAlign:'center',fontSize:10,color:'rgba(255,255,255,.32)',letterSpacing:.5,fontFamily:'ui-monospace,Menlo,Consolas,monospace',marginTop:14}}>Build {BUILD_INFO}</div>}
        </div>
      </div>)}


      {(()=>{
        const _blurbs=(<>
      {mode==='learn'&&openIdx!==null&&introCard&&(<div onClick={()=>setIntroCard(false)} style={{position:'fixed',inset:0,zIndex:120,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:18}}>
        <div onClick={e=>e.stopPropagation()} style={{maxWidth:380,width:'92%',background:'linear-gradient(150deg,#1b1d24,#101116)',border:'1px solid rgba(var(--acr),.5)',borderRadius:16,padding:'18px 18px 16px',boxShadow:'0 20px 60px rgba(0,0,0,.6)',position:'relative'}}>
          <div style={{fontSize:'clamp(15px,3.8vw,20px)',fontWeight:800,color:'var(--ac2)',marginBottom:8,paddingRight:30}}>{learnLabel||LIB[openIdx].name}</div>
          <div style={{fontSize:'clamp(13px,3vw,15px)',color:'rgba(255,255,255,.9)',lineHeight:1.55,maxHeight:'40vh',overflowY:'auto'}}>{learnIdea||LIB[openIdx].idea}</div>
          {(learnPlans||LIB[openIdx].plans)&&(<div style={{fontSize:'clamp(12px,2.8vw,14px)',color:'rgba(255,255,255,.7)',lineHeight:1.5,marginTop:13,paddingTop:13,borderTop:'1px solid rgba(255,255,255,.13)',maxHeight:'26vh',overflowY:'auto'}}>{learnPlans||LIB[openIdx].plans}</div>)}
          <button onClick={()=>setIntroCard(false)} style={{...btn('var(--ac)','none','#fff'),width:'100%',marginTop:15}}>Got it — play ▶</button>
          <button onClick={()=>setIntroCard(false)} aria-label="Close" style={{position:'absolute',top:9,right:9,width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.22)',color:'#fff',fontSize:15,lineHeight:1,cursor:'pointer'}}>✕</button>
        </div>
      </div>)}
      {/* Context bars */}
      {mode==='play'&&!(isOver||playEnd)&&(<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:7,minHeight:18}}>
        <div style={{width:9,height:9,borderRadius:'50%',background:game.turn==='w'?'#fff':'rgba(255,255,255,.2)',boxShadow:game.turn==='w'?'0 0 7px #fff':'none',border:'1.5px solid rgba(255,255,255,.4)'}}/>
        <span style={{fontSize:'clamp(9px,2.2vw,12px)',color:status==='check'||status==='checkmate'?'#ff6b6b':(isOver||playEnd)?'var(--ac)':'rgba(255,255,255,.8)',fontWeight:500}}>{thinking&&!playEnd?'Computer thinking…':((isOver||playEnd||status==='check')?turnTxt:'')}</span>
        <div style={{width:9,height:9,borderRadius:'50%',background:game.turn==='b'?'#333':'rgba(255,255,255,.1)',boxShadow:game.turn==='b'?'0 0 7px rgba(0,0,0,.8)':'none',border:'1.5px solid rgba(255,255,255,.25)'}}/>
      </div>)}
      {false&&mode==='play'&&(()=>{const md=materialDiff(game.board);const start={p:8,n:2,b:2,r:2,q:1};const cnt={w:{},b:{}};for(const rr of game.board)for(const pp of rr)if(pp&&pp.t!=='k')cnt[pp.c][pp.t]=(cnt[pp.c][pp.t]||0)+1;const capOf=(victim)=>['q','r','b','n','p'].flatMap(t=>{const k=(start[t]||0)-(cnt[victim][t]||0);return k>0?Array.from({length:k},(_,i)=>t+'_'+i):[];});const wCap=capOf('b'),bCap=capOf('w');const gl=(arr,color)=>arr.map((tok,i)=>(<span key={i} style={{marginRight:-2}}><Piece t={tok[0]} color={color} sz={15}/></span>));return(
        <div style={{marginBottom:8,display:'flex',justifyContent:'center',alignItems:'center',gap:12,flexWrap:'wrap',minHeight:21}}>
          <div style={{display:'flex',alignItems:'center'}}><span style={{fontSize:12,color:'rgba(255,255,255,.4)',marginRight:5}}>♔</span>{gl(wCap,'b')}{md>0&&<span style={{marginLeft:7,fontSize:'clamp(10px,2.2vw,12px)',fontWeight:800,color:'#86d99a'}}>+{md}</span>}</div>
          <div style={{width:1,height:15,background:'rgba(255,255,255,.14)'}}/>
          <div style={{display:'flex',alignItems:'center'}}><span style={{fontSize:12,color:'rgba(255,255,255,.4)',marginRight:5}}>♚</span>{gl(bCap,'w')}{md<0&&<span style={{marginLeft:7,fontSize:'clamp(10px,2.2vw,12px)',fontWeight:800,color:'#86d99a'}}>+{-md}</span>}</div>
        </div>);})()}
      {false&&mode==='play'&&opponent!=='online'&&timeCtrl&&timeCtrl.kind!=='corr'&&(<div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:8}}>
        {['w','b'].map(side=>{const active=!isOver&&!playEnd&&clock.run&&game.turn===side;const low=clock[side]<=20000;const mine=opponent==='computer'&&side===pColor;return(
          <div key={side} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:12,background:active?'rgba(var(--acr),.22)':'rgba(255,255,255,.05)',border:active?'1.5px solid var(--ac)':'1px solid rgba(255,255,255,.12)',minWidth:78,justifyContent:'center'}}>
            <span style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.6)',fontWeight:700}}>{side==='w'?'♔':'♚'}{mine?' You':''}</span>
            <span style={{fontFamily:'monospace',fontSize:'clamp(13px,3.4vw,17px)',fontWeight:800,letterSpacing:.5,color:clock[side]<=0?'#ec9a90':(low?'#f0b429':'#fff')}}>{fmtClock(clock[side])}</span>
          </div>);})}
      </div>)}
      {mode==='play'&&opponent==='computer'&&eloMsg&&(isOver||playEnd)&&(<div style={{textAlign:'center',marginBottom:8}}>
        <span style={{fontSize:'clamp(9px,2.1vw,11.5px)',fontWeight:700,color:'var(--ac2)',background:'rgba(var(--acr),.14)',border:'1px solid rgba(var(--acr),.3)',borderRadius:20,padding:'3px 11px'}}>{eloMsg}</span>
      </div>)}
      {mode==='learn'&&openIdx!==null&&(<div style={{textAlign:'center',marginBottom:8,maxWidth:boardPx+44,width:'98vw'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
          <div style={{fontSize:'clamp(14px,3.5vw,19px)',fontWeight:800,color:'var(--ac2)',letterSpacing:.3}}>{learnLabel||LIB[openIdx].name}{(()=>{const _cs=lessonStats(LIB[openIdx]);if(_cs.linesLearned===0)return null;const m=_cs.mastered;if(m)return <span style={{marginLeft:8,fontSize:'clamp(10px,2.4vw,12px)',fontWeight:800,color:'#f0c24d',background:'rgba(240,180,41,.14)',border:'1px solid rgba(240,180,41,.45)',borderRadius:20,padding:'2px 9px',verticalAlign:'middle'}}>★ Mastered</span>;if(_cs.coverage)return <span style={{marginLeft:8,fontSize:'clamp(10px,2.4vw,12px)',fontWeight:800,color:'#6cc78a',background:'rgba(108,199,138,.12)',border:'1px solid rgba(108,199,138,.4)',borderRadius:20,padding:'2px 9px',verticalAlign:'middle'}}>✓ {_cs.unionDays}/{LEARN_GOAL}</span>;return null;})()}</div>
          {(()=>{const _st=lessonStats(LIB[openIdx]);const n=_st.unionDays;const m=_st.mastered;return(<div style={{display:'flex',alignItems:'center',gap:4,marginTop:4}}>{Array.from({length:LEARN_GOAL}).map((_,i)=>(<span key={i} style={{width:9,height:9,borderRadius:'50%',background:i<n?(m?'#f0c24d':'#6cc78a'):'rgba(255,255,255,.10)',border:'1px solid '+(i<n?(m?'#f0c24d':'#6cc78a'):'rgba(255,255,255,.28)')}}/>))}<span style={{marginLeft:6,fontSize:'clamp(9px,2.1vw,11px)',fontWeight:800,color:m?'#f0c24d':(n>0?'#6cc78a':'rgba(255,255,255,.55)')}}>{m?'Mastered':(n+' of '+LEARN_GOAL+' flawless days'+(_st.lines>1?(' · '+_st.linesLearned+'/'+_st.lines+' lines'):''))}</span></div>);})()}
          <button onClick={()=>setIntroCard(true)} title="About this opening" style={{flexShrink:0,height:26,borderRadius:7,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.2)',color:'rgba(255,255,255,.85)',fontSize:'clamp(11px,2.5vw,13px)',fontWeight:700,cursor:'pointer',lineHeight:1,padding:'0 11px'}}>ℹ about</button>
        </div>
        {infoOpen?(<>
          <div style={{margin:'8px auto 0',background:'linear-gradient(150deg,rgba(var(--acr),.20),rgba(var(--acr),.08))',border:'1px solid rgba(var(--acr),.34)',borderRadius:12,padding:'11px 13px',fontSize:'clamp(12px,2.7vw,14.5px)',color:'rgba(255,255,255,.92)',lineHeight:1.55,textAlign:'left',boxShadow:SHADOW_BOX}}>{learnIdea||LIB[openIdx].idea}</div>
          <div style={{margin:'8px auto 0',minHeight:90,boxSizing:'border-box',display:'flex',alignItems:'center',background:learnPhase==='demo'?'linear-gradient(150deg,rgba(240,180,41,.18),rgba(240,180,41,.06))':'linear-gradient(150deg,rgba(var(--acr),.18),rgba(var(--acr),.06))',border:`1px solid ${learnPhase==='demo'?'rgba(240,180,41,.46)':'rgba(var(--acr),.32)'}`,borderRadius:12,padding:'10px 13px',fontSize:'clamp(12px,2.7vw,14.5px)',lineHeight:1.55,textAlign:'left',boxShadow:SHADOW_BOX}}>
            <div style={{width:'100%'}}>
              {learnPhase==='demo'?(demoPly===0
                ? <span style={{color:'var(--ac2)',fontWeight:600}}>▶ Press Play (or ›) to watch it move by move — you'll be {LIB[openIdx].side==='w'?'White':'Black'}</span>
                : <span style={{color:'rgba(255,255,255,.92)'}}><span style={{fontWeight:800,color:'#f0b429'}}>{Math.ceil(demoPly/2)}{demoPly%2===1?'.':'…'} {learnLine[demoPly-1]}</span>{curNote?<span> — {curNote}</span>:null}</span>
              ):(
                <span style={{fontWeight:600,color:openMsg.startsWith('✗')?'#ffb86b':(openMsg.startsWith('🎉')?'var(--ac)':'var(--ac2)')}}>{openMsg||`Your move — you play ${LIB[openIdx].side==='w'?'White':'Black'}`}</span>
              )}
            </div>
          </div>
        </>):(
          <div style={{margin:'5px auto 0',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',borderRadius:8,padding:'7px 11px',height:56,boxSizing:'border-box',overflowY:'auto',fontSize:'clamp(10px,2.3vw,12px)',lineHeight:1.4,textAlign:'left',color:'rgba(255,255,255,.85)'}}>
            {learnPhase==='demo'
              ? (demoPly===0?<span style={{color:'var(--ac2)'}}>▶ Press Play to watch</span>:<span><span style={{fontWeight:700,color:'#f0b429'}}>{Math.ceil(demoPly/2)}{demoPly%2===1?'.':'…'} {learnLine[demoPly-1]}</span>{curNote?<span> — {curNote}</span>:null}</span>)
              : <span style={{fontWeight:600,color:openMsg.startsWith('✗')?'#ffb86b':(openMsg.startsWith('🎉')?'var(--ac)':'var(--ac2)')}}>{openMsg||`Your move (${LIB[openIdx].side==='w'?'White':'Black'})`}</span>}
          </div>
        )}
        {learnPhase==='demo'&&(<div style={{margin:'9px auto 0',maxWidth:340,display:'flex',gap:6,alignItems:'stretch'}}>
          <button onClick={()=>{setDemoPlaying(false);setDemoPly(p=>Math.max(0,p-1));}} aria-label="Step back" style={{...btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff'),width:46,minWidth:46,padding:'8px 0',fontSize:'clamp(14px,3.4vw,17px)'}}>‹</button>
          <button onClick={()=>{if(demoPly>=learnLine.length){setDemoPly(0);setDemoPlaying(true);}else setDemoPlaying(p=>!p);}} style={{...btn('var(--ac)','none','#fff'),flex:1,padding:'8px 6px',fontWeight:800}}>{demoPlaying?'⏸ Pause':(demoPly>=learnLine.length?'↻ Replay':'▶ Play')}</button>
          <button onClick={()=>{setDemoPlaying(false);setDemoPly(p=>Math.min(learnLine.length,p+1));}} aria-label="Step forward" style={{...btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff'),width:46,minWidth:46,padding:'8px 0',fontSize:'clamp(14px,3.4vw,17px)'}}>›</button>
          <button onClick={()=>{setDemoPly(0);setDemoPlaying(true);}} aria-label="Replay from start" style={{...btn('transparent','1px solid rgba(255,255,255,.28)','rgba(255,255,255,.85)'),width:46,minWidth:46,padding:'8px 0',fontSize:'clamp(14px,3.4vw,17px)'}}>↻</button>
        </div>)}
      </div>)}
      {railed&&learnPlansBox}
      {null}
      {railed&&learnVideoBox}
      {inReview&&reviewView==='summary'&&review.summary&&(()=>{const S=review.summary;const CATS=[['Brilliant','#22d3ee'],['Great','#7bd3c0'],['Best','#7bd88f'],['Good','#9ccb8f'],['Book','#9aa6b2'],['Inaccuracy','#f0cf5e'],['Miss','#f08a5d'],['Mistake','#f0a24e'],['Blunder','#ec5c4e']];const sides=[['w','White'],['b','Black']];return(
        <div style={{position:'fixed',inset:0,zIndex:500,background:baseBg,backgroundImage:appBgImg,display:'flex',flexDirection:'column',alignItems:'center',padding:`max(24px,env(safe-area-inset-top,0px)) 18px max(20px,env(safe-area-inset-bottom,0px))`,overflowY:'auto',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
          <div style={{width:'100%',maxWidth:460,display:'flex',flexDirection:'column',gap:14}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:headFont,fontSize:'clamp(22px,6vw,30px)',fontWeight:800,color:'#fff',letterSpacing:.5}}>Game Review</div>
              <div style={{marginTop:4,fontSize:'clamp(12px,2.9vw,14px)',color:'rgba(255,255,255,.7)',fontWeight:600}}>{review.headers.White||'White'} vs {review.headers.Black||'Black'}{review.headers.Result?(' · '+review.headers.Result):''}</div>
            </div>
            {review.openingName&&(<div style={{textAlign:'center',fontSize:'clamp(12px,2.8vw,14px)',color:'rgba(255,255,255,.8)'}}>📖 <b style={{color:'var(--ac2)'}}>{review.openingName.name}</b></div>)}{(()=>{const uc=S.userColor;if(!uc)return null;const me=S[uc];const c=me.counts;const acc=me.accuracy;const R=review.headers.Result;const won=(R==='1-0'&&uc==='w')||(R==='0-1'&&uc==='b');const lost=(R==='1-0'&&uc==='b')||(R==='0-1'&&uc==='w');const bl=c.Blunder||0,mi=(c.Mistake||0)+(c.Miss||0),br=c.Brilliant||0;let m;if(br>0)m='Sharp eye. You found '+br+' brilliant move'+(br>1?'s':'')+'. '+(won?'A deserved win.':bl>0?('Now clean up the '+bl+' blunder'+(bl>1?'s':'')+' below.'):'Strong play.');else if(won&&bl===0&&acc>=85)m='Clean game. You stayed accurate and converted without slipping.';else if(won&&bl>0)m='You won, but '+bl+' blunder'+(bl>1?'s':'')+' made it closer than it needed to be. See them below.';else if(lost&&bl>0)m='Those '+bl+' blunder'+(bl>1?'s':'')+' cost you. Step through them below to see the better line.';else if(lost)m='A tough one. The key moments below show where it turned.';else m=(bl+mi>0)?('Solid overall. Tighten the '+(bl+mi)+' costly move'+((bl+mi)>1?'s':'')+' flagged below.'):'Solid, accurate game throughout.';return(<div style={{display:'flex',gap:9,alignItems:'flex-start',background:'rgba(var(--acr),.1)',border:'1px solid rgba(var(--acr),.3)',borderRadius:14,padding:'10px 13px'}}><span style={{fontSize:18,lineHeight:1.2}}>💬</span><span style={{fontSize:'clamp(12px,2.9vw,14.5px)',color:'#fff',fontWeight:600,lineHeight:1.45}}>{m}</span></div>);})()}
            {(()=>{const W=S.w,B=S.b,uc=S.userColor;const colHead=(sk,sl,d)=>{const me=uc===sk;return(<div style={{flex:1,minWidth:0,textAlign:'center',padding:'6px 2px',borderRadius:12,background:me?'rgba(var(--acr),.14)':'transparent',border:me?'1px solid var(--ac)':'1px solid transparent'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:5}}><Piece t="k" color={sk} sz={20}/><span style={{fontSize:'clamp(13px,3.2vw,15px)',fontWeight:800,color:'#fff'}}>{sl}</span>{me&&<span style={{fontSize:8.5,fontWeight:800,color:'var(--ac2)',background:'rgba(var(--acr),.2)',borderRadius:6,padding:'1px 5px'}}>YOU</span>}</div>
                <div style={{fontSize:'clamp(27px,8vw,38px)',fontWeight:900,color:'#fff',lineHeight:1}}>{d.accuracy}<span style={{fontSize:'.45em',fontWeight:700,color:'rgba(255,255,255,.55)'}}>%</span></div>
                <div style={{fontSize:'clamp(9px,2.1vw,11px)',color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:.5,textTransform:'uppercase',marginTop:1}}>Accuracy</div>
                <div style={{marginTop:5,display:'flex',alignItems:'baseline',justifyContent:'center',gap:4}}><span style={{fontSize:'clamp(15px,4vw,19px)',color:'var(--ac2)',fontWeight:900,lineHeight:1}}>≈{d.rating}</span><span style={{fontSize:'clamp(9px,2vw,10.5px)',color:'rgba(255,255,255,.58)',fontWeight:700,letterSpacing:.3,textTransform:'uppercase'}}>est</span></div>
              </div>);};return(
            <div style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.16)',borderRadius:16,padding:'14px 14px',boxShadow:SHADOW_BOX}}>
              <div style={{display:'flex',alignItems:'stretch',gap:8}}>{colHead('w','White',W)}<div style={{width:1,background:'rgba(255,255,255,.14)'}}/>{colHead('b','Black',B)}</div>
              <div style={{marginTop:13,borderTop:'1px solid rgba(255,255,255,.1)',paddingTop:10,display:'flex',flexDirection:'column',gap:6}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 48px 48px',gap:8,fontSize:'clamp(9.5px,2.1vw,11.5px)',color:'rgba(255,255,255,.6)',fontWeight:800}}><span></span><span style={{textAlign:'center'}}>White</span><span style={{textAlign:'center'}}>Black</span></div>
                {CATS.map(([lbl,col])=>(<div key={lbl} style={{display:'grid',gridTemplateColumns:'1fr 48px 48px',alignItems:'center',fontSize:'clamp(12.5px,3vw,15px)',gap:8}}>
                  <span style={{display:'flex',alignItems:'center',gap:7,color:'rgba(255,255,255,.8)'}}><span style={{width:9,height:9,borderRadius:'50%',background:col,flexShrink:0}}/>{lbl}</span>
                  <b style={{textAlign:'center',color:W.counts[lbl]?'#fff':'rgba(255,255,255,.3)',fontWeight:800}}>{W.counts[lbl]}</b>
                  <b style={{textAlign:'center',color:B.counts[lbl]?'#fff':'rgba(255,255,255,.3)',fontWeight:800}}>{B.counts[lbl]}</b>
                </div>))}
              </div>
            </div>);})()}
            {(()=>{const moments=review.analysis.map((o,i)=>({o,i})).filter(({o,i})=>{const mc=i%2===0?'w':'b';if(S.userColor&&mc!==S.userColor)return false;const L=o.cls&&o.cls.label;return L==='Blunder'||L==='Mistake';}).sort((a,b)=>(b.o.loss||0)-(a.o.loss||0)).slice(0,3);if(!moments.length)return null;return(
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                <div style={{fontSize:'clamp(11px,2.5vw,13px)',color:'rgba(255,255,255,.55)',fontWeight:700,letterSpacing:.6,textTransform:'uppercase'}}>Key moments</div>
                {moments.map(({o,i})=>{const L=o.cls.label;const col=L==='Blunder'?'#ec5c4e':'#f0a24e';return(
                  <button key={i} onClick={()=>{setReviewView('moves');setPly(i+1);}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',textAlign:'left',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,padding:'10px 12px',cursor:'pointer',color:'#fff',boxShadow:SHADOW_BOX}}>
                    <span style={{fontSize:'clamp(16px,4vw,20px)',fontWeight:900,color:col,flexShrink:0,width:24,textAlign:'center'}}>{o.cls.i}</span>
                    <span style={{flex:1,minWidth:0}}><b style={{fontSize:'clamp(13px,3.2vw,15px)',fontWeight:800}}>{Math.floor(i/2)+1}{i%2===0?'.':'…'} {review.plies[i].san}</b> <span style={{fontSize:'clamp(11px,2.6vw,13px)',color:'rgba(255,255,255,.55)'}}>· {L.toLowerCase()}{o.bestSan?(' · better: '+o.bestSan):''}</span></span>
                    <span style={{color:'var(--ac)',fontWeight:800,flexShrink:0}}>›</span>
                  </button>);})}
              </div>);})()}
            <button onClick={()=>setReviewView('moves')} style={{...navBtn(true),flex:'0 0 auto',width:'100%'}}>Start review ›</button>
            <button onClick={resetReview} style={{...navBtn(false),flex:'0 0 auto',width:'100%',minHeight:44,fontSize:'clamp(13px,3vw,15px)'}}>‹ Back to games</button>
            <div style={{textAlign:'center',fontSize:'clamp(10px,2.2vw,11.5px)',color:'rgba(255,255,255,.4)',lineHeight:1.5}}>Accuracy and rating are rough estimates from average centipawn loss, not official ratings.</div>
          </div>
        </div>);})()}
      {inReview&&(<div style={{width:boardPx,maxWidth:'98vw',marginBottom:6}}>
        <button onClick={()=>setReviewView('summary')} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:10,background:'rgba(var(--acr),.16)',border:'1px solid rgba(var(--acr),.4)',color:'var(--ac2)',cursor:'pointer',fontSize:'clamp(12px,2.7vw,14px)',fontWeight:700,boxShadow:SHADOW_BTN}}>‹ Summary</button>
        <div style={{textAlign:'center',marginTop:7,fontSize:'clamp(11px,2.6vw,14px)',fontWeight:600,color:'rgba(255,255,255,.85)'}}>
          {review.headers.White||'White'} <span style={{color:'rgba(255,255,255,.4)'}}>vs</span> {review.headers.Black||'Black'}
          {review.headers.Result&&<span style={{color:'var(--ac)',marginLeft:6}}>{review.headers.Result}</span>}
        </div>
      </div>)}

      {/* ── Analyze: import panel (no review yet) ── */}
      {mode==='analyze'&&!inReview&&!analyzing&&(
        <div style={{width:boardPx+22,maxWidth:'98vw',display:'flex',flexDirection:'column',gap:10,marginTop:6}}>
          {lastReview&&!review&&(<button onClick={()=>{setReview(lastReview);setReviewView('summary');}} style={{alignSelf:'flex-start',display:'inline-flex',alignItems:'center',gap:7,padding:'8px 13px',borderRadius:10,background:'rgba(var(--acr),.16)',border:'1px solid rgba(var(--acr),.4)',color:'var(--ac2)',cursor:'pointer',fontSize:'clamp(14px,3.4vw,17px)',fontWeight:700,boxShadow:SHADOW_BTN}}>‹ Back to your analysis</button>)}
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'clamp(14px,3.4vw,18px)',color:'#fff',fontWeight:800}}>Review any game, from anywhere</div>
            <div style={{fontSize:'clamp(14px,3.2vw,16px)',color:'var(--ac2)',fontWeight:600,marginTop:3,lineHeight:1.45}}>Pull in your games from Chess.com or Lichess and review them all. Unlimited and free.</div>
          </div>
          {(()=>{const GS=gameStatsRef.current||{};const gk=Object.keys(GS);const gReviewed=gk.length;let tB=0;gk.forEach(k=>{const s=GS[k]||{};tB+=s.bril||0;});const pr=pzRank(pzSolvedMap);const pTot=pzTotalSolved(pzSolvedMap)+pzOSolved;const has=gReviewed>0||pTot>0||pzXP>0;if(!has)return null;const cells=[['Games reviewed',gReviewed,'#7bd1ff'],['Puzzles solved',pTot,'#7bd88f'],['Rank',pr+' / '+PZ_TIERS.length,'#e0b85a'],['XP',pzXP,'#f0cf5e'],['Best streak',pzBest,'#f0a24e'],['Brilliancies',tB,'#22d3ee']];return(
            <div style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',borderRadius:14,padding:'12px 12px',boxShadow:SHADOW_BOX}}>
              <div style={{fontSize:'clamp(13.5px,3.1vw,15.5px)',color:'rgba(255,255,255,.55)',fontWeight:700,letterSpacing:.6,textTransform:'uppercase',marginBottom:10}}>Your progress</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:9}}>
                {cells.map(([lab,val,col])=>(<div key={lab} style={{background:'rgba(255,255,255,.04)',borderRadius:11,padding:'10px 6px',textAlign:'center'}}><div style={{fontSize:'clamp(18px,5vw,24px)',fontWeight:900,color:col,lineHeight:1}}>{val}</div><div style={{fontSize:'clamp(12.5px,2.9vw,14px)',color:'rgba(255,255,255,.6)',fontWeight:600,marginTop:4,lineHeight:1.2}}>{lab}</div></div>))}
              </div>
              <div onClick={()=>setAchvOpen(true)} style={{marginTop:11,paddingTop:11,borderTop:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',gap:9,cursor:'pointer'}}>
                <span style={{fontSize:17,lineHeight:1}}>🏅</span>
                <span style={{flex:1,minWidth:0,fontSize:'clamp(12.5px,2.9vw,14px)',color:'rgba(255,255,255,.85)',fontWeight:700}}>Achievements</span>
                <div style={{display:'flex',gap:3,alignItems:'center'}}>{ACHV.filter(a=>(achv||[]).includes(a.id)).slice(-5).map(a=>(<span key={a.id} style={{fontSize:15,lineHeight:1}}>{a.ic}</span>))}</div>
                <span style={{fontSize:'clamp(11px,2.5vw,12.5px)',color:'var(--ac2)',fontWeight:800}}>{(achv||[]).length}/{ACHV.length}</span>
                <span style={{fontSize:18,color:'var(--ac2)',opacity:.6}}>›</span>
              </div>
            </div>);})()}
          {myMistakes.length>0&&(<button onClick={startMistakes} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'13px 14px',borderRadius:14,background:'linear-gradient(135deg,rgba(240,162,78,.2),rgba(240,162,78,.06))',border:'1px solid rgba(240,162,78,.45)',color:'#fff',cursor:'pointer',textAlign:'left',boxShadow:SHADOW_BOX}}>
            <span style={{flexShrink:0,width:44,height:44,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,background:'linear-gradient(150deg,#f59e0b,#b45309)',boxShadow:'0 4px 12px rgba(180,83,9,.4)'}}>🎯</span>
            <span style={{flex:1,minWidth:0}}>
              <span style={{display:'block',fontSize:'clamp(14px,3.2vw,17px)',fontWeight:800}}>Practice your mistakes</span>
              <span style={{display:'block',fontSize:'clamp(13.5px,3.1vw,15.5px)',color:'rgba(255,255,255,.6)',lineHeight:1.4}}>{myMistakes.length} position{myMistakes.length>1?'s':''} from your reviewed games · find the move you missed</span>
            </span>
            <span style={{flexShrink:0,fontSize:20,color:'#f0b35e'}}>›</span>
          </button>)}
          {myBrilliant.length>0&&(<button onClick={startBrilliant} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'13px 14px',borderRadius:14,background:'linear-gradient(135deg,rgba(34,211,238,.2),rgba(34,211,238,.06))',border:'1px solid rgba(34,211,238,.45)',color:'#fff',cursor:'pointer',textAlign:'left',boxShadow:SHADOW_BOX}}>
            <span style={{flexShrink:0,width:44,height:44,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,background:'linear-gradient(150deg,#22d3ee,#0e7490)',boxShadow:'0 4px 12px rgba(14,116,144,.4)'}}>✨</span>
            <span style={{flex:1,minWidth:0}}>
              <span style={{display:'block',fontSize:'clamp(14px,3.2vw,17px)',fontWeight:800}}>Your brilliant moves</span>
              <span style={{display:'block',fontSize:'clamp(13.5px,3.1vw,15.5px)',color:'rgba(255,255,255,.6)',lineHeight:1.4}}>{myBrilliant.length} brilliant move{myBrilliant.length>1?'s':''} you found · can you spot them again?</span>
            </span>
            <span style={{flexShrink:0,fontSize:20,color:'#22d3ee'}}>›</span>
          </button>)}
          <div style={{background:'rgba(var(--acr),.08)',border:'1px solid rgba(var(--acr),.25)',borderRadius:12,padding:'12px 12px',display:'flex',flexDirection:'column',gap:9}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:'clamp(15px,3.6vw,19px)',lineHeight:1}}>📥</span><span style={{fontSize:'clamp(14px,3.2vw,17px)',fontWeight:800,color:'#fff'}}>Import from</span></div>
            <div style={{display:'flex',gap:7,alignItems:'center'}}>
              <select value={importSrc} onChange={e=>setImportSrc(e.target.value)} aria-label="Choose site" style={{flexShrink:0,padding:'9px 8px',borderRadius:8,background:'#2a2a40',color:'#fff',border:'1.5px solid rgba(255,255,255,.18)',fontSize:'clamp(14px,3.2vw,16px)',fontWeight:700,maxWidth:'40%'}}>
                <option value="cc">Chess.com</option>
                <option value="li">Lichess</option>
              </select>
              <input value={importSrc==='cc'?chessUser:lichessUser} onChange={e=>(importSrc==='cc'?setChessUser:setLichessUser)(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')(importSrc==='cc'?fetchChessCom:fetchLichess)();}} placeholder={importSrc==='cc'?'Chess.com username':'Lichess username'} style={{flex:1,minWidth:0,padding:'9px 11px',borderRadius:8,background:'#2a2a40',color:'#fff',border:'1.5px solid rgba(255,255,255,.18)',fontSize:'clamp(14px,3.2vw,16px)'}}/>
              <button onClick={()=>(importSrc==='cc'?fetchChessCom:fetchLichess)()} disabled={ccLoading} style={{...btn('var(--ac)','none','#fff'),whiteSpace:'nowrap',opacity:ccLoading?.6:1}}>{ccLoading?'…':'Fetch'}</button>
            </div>
            {ccErr&&<div style={{fontSize:'clamp(13px,2.9vw,15px)',color:'#ffb86b',lineHeight:1.5}}>{ccErr}</div>}
            {ccGames&&ccGames.length>0&&(()=>{const _gs=gameSearch.trim().toLowerCase();const _shown=ccGames.filter(g=>!_gs||((g.white+' '+g.black+' '+(g.src==='li'?'lichess':'chess.com')).toLowerCase().includes(_gs)));return(<>
              <div ref={gamesListRef} style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:8,marginTop:3}}>
                <span style={{fontSize:'clamp(14px,3.2vw,16px)',fontWeight:800,color:'#fff'}}>Your games <span style={{color:'rgba(255,255,255,.42)',fontWeight:600,fontSize:'.86em'}}>· latest first</span></span>
                <span style={{flexShrink:0,fontSize:'clamp(12px,2.7vw,14px)',color:'rgba(255,255,255,.4)',fontWeight:600}}>{ccGames.length} loaded</span>
              </div>
              {ccGames.length>6&&(<input value={gameSearch} onChange={e=>setGameSearch(e.target.value)} placeholder="Filter by player name" style={{width:'100%',padding:'6px 10px',borderRadius:7,background:'rgba(0,0,0,.25)',color:'rgba(255,255,255,.85)',border:'1px solid rgba(255,255,255,.10)',fontSize:'clamp(13px,2.9vw,15px)'}}/>)}
              <div className="scroll" style={{display:'flex',flexDirection:'column',gap:6,maxHeight:'min(46vh,340px)',overflowY:'auto'}}>
              {_shown.map((g,i)=>{const info=gameInfo(g);const bd=outcomeBadge(info.code);const st=gameStatsRef.current[gkey(g)];return(
                <button key={i} onClick={()=>pickCcGame(g)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 11px',borderRadius:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',color:'#fff',cursor:'pointer',textAlign:'left',fontFamily:"'Segoe UI',system-ui,sans-serif",boxShadow:SHADOW_BTN}}>
                  <span style={{flexShrink:0,width:44,textAlign:'center',fontSize:'clamp(12.5px,2.8vw,14.5px)',fontWeight:800,letterSpacing:.4,color:bd.c,background:bd.bg,border:'1px solid '+bd.br,borderRadius:7,padding:'6px 0'}}>{bd.t}</span>
                  <span style={{minWidth:0,flex:1}}>
                    <span style={{display:'block',fontSize:'clamp(14.5px,3.4vw,17px)',fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{info.opp?('vs '+info.opp):(g.white+' vs '+g.black)}</span>
                    <span style={{display:'block',fontSize:'clamp(12.5px,2.8vw,14.5px)',color:'rgba(255,255,255,.55)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}><span style={{color:g.src==='li'?'#c9b6ff':'#9bd6a0',fontWeight:700}}>{g.src==='li'?'Lichess':'Chess.com'}</span>{info.userColor?(' · '+(info.userColor==='w'?'as White':'as Black')):''}{g.tc?(' · '+tcLabel(g.tc)):''}{g.date?(' · '+new Date(g.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})):''}</span>
                    {st&&(<span style={{display:'inline-flex',gap:9,marginTop:4,fontSize:'clamp(13.5px,3vw,15.5px)',fontWeight:800,fontFamily:'monospace'}}>{st.bril>0&&<span style={{color:'#22d3ee'}}>!! {st.bril}</span>}<span style={{color:'#6fd66f'}}>★ {st.great}</span><span style={{color:'#f0a24e'}}>? {st.mist}</span><span style={{color:'#ec5c4e'}}>?? {st.blun}</span></span>)}
                  </span>
                  <span style={{flexShrink:0,fontSize:'clamp(12.5px,2.8vw,14.5px)',color:'var(--ac2)',fontWeight:700}}>Review ›</span>
                </button>);})}
              </div></>);})()}
          </div>
          <div style={{textAlign:'center',fontSize:'clamp(13px,2.9vw,15px)',color:'rgba(255,255,255,.4)',fontWeight:600,letterSpacing:.5}}>— OR PASTE A PGN —</div>
          <textarea value={pgnText} onChange={e=>setPgnText(e.target.value)} placeholder={'Paste your PGN here, e.g.\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ...\n\nor the full Chess.com export with [Event ...] headers.'} 
            style={{width:'100%',minHeight:130,padding:12,borderRadius:10,background:'#2a2a40',color:'#fff',border:'1.5px solid rgba(255,255,255,.18)',fontSize:'clamp(14px,3.2vw,16px)',resize:'vertical',lineHeight:1.5,fontFamily:'monospace'}}/>
          {pgnErr&&<div style={{fontSize:'clamp(13px,2.9vw,15px)',color:'#ffb86b',lineHeight:1.4}}>{pgnErr}</div>}
          <button onClick={importGame} style={{...btn('var(--ac)','none','#fff'),padding:'12px',fontSize:'clamp(14px,3.4vw,17px)',fontWeight:700}}>⚡ Analyze Game</button>
          <div style={{fontSize:'clamp(12.5px,2.8vw,14.5px)',color:'rgba(255,255,255,.5)',lineHeight:1.6}}>
            <b style={{color:'rgba(255,255,255,.7)'}}>Getting your game from Chess.com:</b><br/>
            Open the finished game → tap <b>Share</b> → <b>PGN</b> → copy, then paste it above. The review finds your mistakes, blunders, and the moves you should have played.
          </div>
        </div>
      )}

      {/* ── Analyze: analyzing progress ── */}
      {mode==='analyze'&&analyzing&&(()=>{const pct=Math.round(progress*100);const R=46,CIRC=2*Math.PI*R;const TIPS=['A brilliant move (!!) gives up material for a winning blow.','Accuracy measures how close your moves were to the best ones.','Blunders are the moves that cost you the most.','Tap a key-moment chip to jump straight to it.','The eval bar shows who is winning, and by how much.'];const tip=TIPS[Math.min(TIPS.length-1,Math.floor(progress*TIPS.length))];return(
        <div style={{width:boardPx,maxWidth:'98vw',marginTop:34,display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
          <div style={{position:'relative',width:124,height:124,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="124" height="124" style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
              <circle cx="62" cy="62" r={R} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="8"/>
              <circle cx="62" cy="62" r={R} fill="none" stroke="var(--ac)" strokeWidth="8" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC*(1-Math.max(0.02,progress))} style={{transition:'stroke-dashoffset .3s ease'}}/>
            </svg>
            <div style={{animation:'floaty 1.6s ease-in-out infinite'}}><Piece t="n" color="w" sz={56}/></div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{fontSize:'clamp(15px,3.7vw,19px)',color:'#fff',fontWeight:800,letterSpacing:.2}}>Analyzing your game</div>
            <div style={{fontSize:'clamp(11px,2.6vw,13px)',color:'var(--ac2)',fontWeight:700}}>{pct}% · checking every move</div>
            <div style={{fontSize:'clamp(9.5px,2.2vw,11.5px)',color:'rgba(255,255,255,.5)',fontWeight:600,marginTop:2,maxWidth:312,textAlign:'center',lineHeight:1.4}}>Running a deep Stockfish pass to catch the tactics and brilliancies, so this takes a few seconds.</div>
          </div>
          <div style={{maxWidth:344,minHeight:36,textAlign:'center',fontSize:'clamp(10px,2.4vw,12.5px)',color:'rgba(255,255,255,.62)',lineHeight:1.45,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'10px 14px'}}>💡 {tip}</div>
        </div>
      );})()}

        </>);
        const _controls=(<>
      {/* ── Review controls ── */}
      {inReview&&(
        <div style={{width:boardPx,maxWidth:'98vw',marginTop:8,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
          {/* move annotation */}
          <div style={{height:118,width:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-start',gap:5,overflowY:'auto'}}>
            {curAnno?(<>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:9,flexWrap:'wrap'}}>
                <span style={{fontSize:'clamp(14px,3.5vw,19px)',fontWeight:700,color:'#fff'}}>{Math.floor((ply-1)/2)+1}{(ply-1)%2===0?'.':'…'} {review.plies[ply-1].san}</span>
                <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:'clamp(12px,3vw,16px)',fontWeight:800,color:curAnno.cls.c,background:curAnno.cls.c+'22',border:'1px solid '+curAnno.cls.c+'66',borderRadius:22,padding:'4px 12px'}}><span style={{fontSize:'clamp(14px,3.5vw,19px)',lineHeight:1}}>{curAnno.cls.i}</span>{curAnno.cls.label}</span>
              </div>
              {(curAnno.cls.label==='Inaccuracy'||curAnno.cls.label==='Mistake'||curAnno.cls.label==='Blunder')&&<button onClick={()=>setShowBest(true)} title="Show the best move on the board" style={{background:'none',border:'none',cursor:'pointer',padding:'2px 4px',fontFamily:"'Segoe UI',system-ui,sans-serif",fontSize:'clamp(14px,3.4vw,17px)',fontWeight:600,color:'rgba(255,255,255,.82)',display:'inline-flex',alignItems:'center',gap:7,flexWrap:'wrap',justifyContent:'center'}}>Better was <b style={{color:'var(--ac2)',fontWeight:800}}>{curAnno.bestSan}</b> <span style={{color:'var(--ac)',fontWeight:700,textDecoration:'underline',textUnderlineOffset:3}}>{showBest?'shown below':'tap to see it'}</span></button>}
              {_annoWhy&&<div style={{width:'100%',maxWidth:440,fontSize:'clamp(11px,2.6vw,13.5px)',color:'rgba(255,255,255,.84)',lineHeight:1.5,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,padding:'9px 12px',textAlign:'center'}}>{_annoWhy}</div>}
            </>):(<span style={{fontSize:'clamp(11px,2.6vw,13px)',color:'rgba(255,255,255,.5)'}}>Starting position — step forward to review →</span>)}
          </div>
          {/* nav */}
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <button onClick={()=>{if(ply>=review.plies.length){setPly(0);setRevAuto(true);}else setRevAuto(a=>!a);}} title={revAuto?'Pause':'Auto-play through the game'} style={revAuto?{...btn('rgba(var(--acr),.22)','1px solid var(--ac)','var(--ac2)'),fontWeight:800}:btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>{revAuto?'⏸':'▶'}</button><button onClick={()=>{setRevAuto(false);setPly(0);}} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>⏮</button>
            <button onClick={()=>{setRevAuto(false);setPly(p=>Math.max(0,p-1));}} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>‹ Prev</button>
            <span style={{fontSize:'clamp(9px,2.1vw,11px)',color:'rgba(255,255,255,.6)',minWidth:54,textAlign:'center',fontFamily:'monospace'}}>{ply}/{review.plies.length}</span>
            <button onClick={()=>{setRevAuto(false);setPly(p=>Math.min(review.plies.length,p+1));}} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>Next ›</button>
            <button onClick={()=>{setRevAuto(false);setPly(review.plies.length);}} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>⏭</button>
          </div>
          {keyPlies.length>0&&(<div style={{display:'flex',gap:7,alignItems:'center',justifyContent:'center'}}>
            <button onClick={()=>jumpKey(-1)} title="Previous key moment" style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>‹</button>
            <button onClick={()=>jumpKey(1)} style={{...btn('rgba(var(--acr),.2)','1px solid var(--ac)','var(--ac2)'),fontWeight:800}}>⏭ Next key moment</button>
            <span style={{fontSize:'clamp(9px,2.1vw,11px)',color:'rgba(255,255,255,.5)'}}>{keyPlies.length} total</span>
          </div>)}
          {/* summary + actions */}
          <div style={{display:'flex',gap:7,flexWrap:'wrap',justifyContent:'center'}}>
            {review.counts.Brilliant>0&&<button onClick={()=>jumpToIssue('Brilliant')} title="Jump to next brilliant move" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:'clamp(13px,3vw,15px)',fontWeight:800,color:'#22d3ee',background:'#22d3ee1f',border:'1px solid #22d3ee66',borderRadius:20,padding:'5px 12px',cursor:'pointer',boxShadow:'0 2px 0 rgba(0,0,0,.25),0 4px 9px rgba(0,0,0,.22)'}}><b style={{fontSize:'clamp(16px,4vw,20px)'}}>{review.counts.Brilliant}</b> brilliant{review.counts.Brilliant>1?' moves':' move'} !! <span style={{opacity:.75,fontSize:'.9em'}}>›</span></button>}
            {review.counts.Great>0&&<button onClick={()=>jumpToIssue('Great')} title="Jump to next great move" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:'clamp(13px,3vw,15px)',fontWeight:800,color:'#7bd3c0',background:'#7bd3c01f',border:'1px solid #7bd3c066',borderRadius:20,padding:'5px 12px',cursor:'pointer',boxShadow:'0 2px 0 rgba(0,0,0,.25),0 4px 9px rgba(0,0,0,.22)'}}><b style={{fontSize:'clamp(16px,4vw,20px)'}}>{review.counts.Great}</b> great{review.counts.Great>1?' moves':' move'} ! <span style={{opacity:.75,fontSize:'.9em'}}>›</span></button>}
            {[[review.counts.Blunder,'#ec5c4e','blunders','Blunder'],[review.counts.Mistake,'#f0a24e','mistakes','Mistake'],[review.counts.Inaccuracy,'#f0cf5e','inaccuracies','Inaccuracy']].map(([cn,c,lab,L])=>(
              cn>0
                ? <button key={lab} onClick={()=>jumpToIssue(L)} title={`Jump to next ${lab.replace(/s$/,'')}`} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:'clamp(13px,3vw,15px)',fontWeight:700,color:c,background:c+'1f',border:'1px solid '+c+'66',borderRadius:20,padding:'5px 12px',cursor:'pointer',boxShadow:'0 2px 0 rgba(0,0,0,.25),0 4px 9px rgba(0,0,0,.22)'}}><b style={{fontSize:'clamp(16px,4vw,20px)'}}>{cn}</b> {lab} <span style={{opacity:.7,fontSize:'.9em'}}>›</span></button>
                : <span key={lab} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:'clamp(12px,3vw,15px)',fontWeight:700,color:c,opacity:.5,background:c+'14',border:'1px solid '+c+'33',borderRadius:20,padding:'5px 12px'}}><b style={{fontSize:'clamp(16px,4vw,20px)'}}>{cn}</b> {lab}</span>
            ))}
          </div>
          {/* eval graph */}
          <EvalGraph analysis={review.analysis} plies={review.plies} ply={ply} onJump={(p)=>setPly(Math.max(0,Math.min(review.plies.length,p)))} width={wide?Math.max(160,sideW-12):boardPx} height={wide?86:62}/>
          {review.openingName&&(<div style={{width:'100%',textAlign:'center',fontSize:'clamp(10px,2.3vw,12.5px)',color:'rgba(255,255,255,.8)'}}>📖 Opening: <b style={{color:'var(--ac2)'}}>{review.openingName.name}</b></div>)}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
            <button onClick={()=>{setSetupFromFEN(toFEN(boardGame));setOpponent('computer');setPColor(boardGame.turn);setTimeCtrl(null);timeCtrlRef.current=null;setOpenIdx(null);setMode('play');setPlaySetup(true);}} style={btn('rgba(var(--acr),.2)','1px solid var(--ac)','var(--ac2)')}>▶ Play from here</button>
            <button onClick={()=>setShowBest(b=>!b)} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)',showBest?'var(--ac)':'rgba(255,255,255,.7)')}>{showBest?'✓ Showing best':'💡 Show best move'}</button>
            <button onClick={()=>setFlip(f=>!f)} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>⟳ Flip</button>
            <button onClick={resetReview} style={btn('#4a6741','none','#fff')}>＋ New game</button>
          </div>
        </div>
      )}

      {/* ── Play controls ── */}
      {mode==='play'&&opponent!=='online'&&(<div style={{marginTop:10,display:'flex',flexDirection:'column',alignItems:'center',gap:8,width:boardPx,maxWidth:'98vw'}}>
        {opponent==='computer'?(<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,flexWrap:'wrap'}}>
          {selBot&&botById(selBot)?(<span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:'clamp(8.5px,1.95vw,11px)',color:'rgba(255,255,255,.72)',fontWeight:700}}><BotFace id={selBot} size={20}/>{botById(selBot).name}</span>):(<span style={{fontSize:'clamp(8px,1.85vw,10.5px)',color:'rgba(255,255,255,.58)'}}>🤖 vs Computer</span>)}
          {!(playHist.length>0&&!isOver&&!playEnd)&&(<div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(var(--acr),.12)',border:'1px solid rgba(var(--acr),.3)',borderRadius:20,padding:'2px 5px'}}>
            <button onClick={()=>setCpuElo(e=>Math.max(ELO_MIN,e-100))} title="Weaker" style={{width:22,height:22,borderRadius:'50%',border:'none',background:'rgba(255,255,255,.12)',color:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',lineHeight:1,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
            <span style={{fontSize:'clamp(9px,2vw,11px)',fontWeight:700,color:'var(--ac2)',minWidth:58,textAlign:'center'}}>≈{cpuElo} Elo</span>
            <button onClick={()=>setCpuElo(e=>Math.min(ELO_MAX,e+100))} title="Stronger" style={{width:22,height:22,borderRadius:'50%',border:'none',background:'rgba(255,255,255,.12)',color:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',lineHeight:1,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
          </div>)}
        </div>):(<div style={{fontSize:'clamp(8px,1.85vw,10.5px)',color:'rgba(255,255,255,.58)'}}>{`👤 vs Human${timeCtrl?(' · '+timeCtrl.label):' · no clock'}`}</div>)}
        {opponent==='computer'&&!(playHist.length>0&&!isOver&&!playEnd)&&(<input type="range" min={ELO_MIN} max={ELO_MAX} step={25} value={cpuElo} onChange={e=>setCpuElo(+e.target.value)} title="Fine-tune strength" style={{width:'100%',maxWidth:320,accentColor:TH.accent,cursor:'pointer',margin:'0 0 2px'}}/>)}
        {(isOver||playEnd)&&game.history&&game.history.length>=2&&<button onClick={reviewPlayedGame} style={{width:'100%',padding:'13px',borderRadius:13,border:'none',background:'linear-gradient(135deg,#6ea8fe,#3b76e8)',color:'#0a1020',fontWeight:800,fontSize:'clamp(13px,3vw,15px)',cursor:'pointer',boxShadow:'0 4px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.35)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>🔍 Review this game</button>}
          <div style={{display:'flex',gap:8,alignItems:'center',width:'100%'}}>
          <button onClick={takeback} disabled={playHist.length===0} title='Takeback' style={{width:46,height:46,flexShrink:0,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,padding:0,background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.18)',color:'#fff',opacity:playHist.length===0?.35:1,cursor:playHist.length===0?'default':'pointer'}}>↶</button>
          <button onClick={requestHint} title='Hint' style={{width:46,height:46,flexShrink:0,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,padding:0,background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.18)',cursor:'pointer',borderColor:'rgba(var(--acr),.4)',color:'var(--ac2)'}}>💡</button>
          <button onClick={()=>setFlip(f=>!f)} title='Flip board' style={{width:46,height:46,flexShrink:0,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,padding:0,background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.18)',color:'#fff',cursor:'pointer'}}>⟳</button>
          <button onClick={resign} disabled={isOver||!!playEnd} title='Resign' style={{width:46,height:46,flexShrink:0,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,padding:0,background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.18)',borderColor:'rgba(232,93,74,.5)',color:'#ff9d8d',opacity:(isOver||playEnd)?.35:1,cursor:(isOver||playEnd)?'default':'pointer'}}>⚐</button>
          <span style={{flex:1}}></span>
          <button onClick={()=>fullReset()} style={{height:46,padding:'0 20px',borderRadius:12,border:'none',background:'var(--ac)',color:'#101010',fontWeight:800,fontSize:'clamp(12px,2.7vw,14px)',cursor:'pointer',boxShadow:'0 4px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.35)'}}>New game</button>
        </div>
      </div>)}

      {/* ── Online multiplayer panel ── */}
      {mode==='play'&&opponent==='online'&&(()=>{
        const og=onlineGame;
        const card={width:boardPx,maxWidth:'98vw',marginTop:10,background:'rgba(110,168,254,.08)',border:'1px solid rgba(110,168,254,.28)',borderRadius:14,padding:'14px 15px',display:'flex',flexDirection:'column',gap:10,alignItems:'stretch'};
        const lbl={fontSize:'clamp(10px,2.3vw,12.5px)',color:'rgba(255,255,255,.55)',fontWeight:700,letterSpacing:.5,textTransform:'uppercase'};
        if(!cloudUser)return(<div style={card}>
          <div style={{fontSize:'clamp(13px,3.2vw,16px)',fontWeight:800,color:'#fff'}}>🌐 Play a friend online</div>
          <div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'rgba(255,255,255,.65)',lineHeight:1.5}}>{onlineCodeInput?('A friend invited you to game '+onlineCodeInput+' — sign in to join.'):"Sign in with Google, then share a code with anyone who has the app. You'll get to choose your account."}</div>
          <button onClick={cloudSignIn} style={{...btn('rgba(110,168,254,.9)','none','#0c1a33'),fontWeight:800}}>Sign in with Google</button>
          {cloudErr&&<div style={{fontSize:'clamp(10px,2.2vw,12px)',color:'#f5a3a3'}}>{cloudErr}</div>}
        </div>);
        if(!og&&mmSearching)return(<div style={card}>
          <div style={{fontSize:'clamp(13px,3.2vw,16px)',fontWeight:800,color:'#fff'}}>⚡ Quick match</div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'8px 0'}}>
            <div style={{fontSize:'clamp(13px,3vw,15px)',fontWeight:800,color:'#cfe0ff'}}>🔎 Finding an opponent…</div>
            <div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'rgba(255,255,255,.6)',textAlign:'center',lineHeight:1.5}}>Pairing you with anyone else tapping Quick match{timeCtrl?(' at '+timeCtrl.label):''}. Keep this screen open.</div>
            <button onClick={onlineCancelMatch} style={{...btn('rgba(236,154,144,.14)','1px solid rgba(236,154,144,.4)','#ec9a90'),width:'100%'}}>Cancel</button>
          </div>
          {onlineErr&&<div style={{fontSize:'clamp(10px,2.2vw,12px)',color:'#f5a3a3'}}>{onlineErr}</div>}
        </div>);
        if(!og)return(<div style={card}>
          <div style={{fontSize:'clamp(13px,3.2vw,16px)',fontWeight:800,color:'#fff'}}>🌐 Play online</div>
          <button onClick={onlineQuickMatch} style={{...btn('rgba(110,168,254,.9)','none','#0c1a33'),fontWeight:800,width:'100%'}}>⚡ Quick match{timeCtrl?(' · '+timeCtrl.label):''}</button>
          <div style={{textAlign:'center',fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.42)',marginTop:-4}}>pairs you with anyone else searching</div>
          <div style={lbl}>or start a private game</div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>onlineCreate('w')} style={{...btn('rgba(255,255,255,.92)','1px solid rgba(255,255,255,.3)','#1a1a1a'),flex:1,fontWeight:800}}>♔ As White</button>
            <button onClick={()=>onlineCreate('b')} style={{...btn('rgba(30,30,34,.95)','1px solid rgba(255,255,255,.3)','#fff'),flex:1,fontWeight:800}}>♚ As Black</button>
          </div>
          <div style={lbl}>or join with a code</div>
          <div style={{display:'flex',gap:8}}>
            <input value={onlineCodeInput} onChange={e=>setOnlineCodeInput(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==='Enter')onlineJoin();}} placeholder="CODE" maxLength={6} style={{flex:1,minWidth:0,background:'rgba(0,0,0,.3)',border:'1px solid rgba(255,255,255,.18)',borderRadius:12,padding:'10px 12px',color:'#fff',fontSize:'clamp(13px,3vw,15px)',letterSpacing:3,textAlign:'center',fontWeight:800}}/>
            <button onClick={()=>onlineJoin()} style={{...btn('rgba(110,168,254,.9)','none','#0c1a33'),fontWeight:800}}>Join</button>
          </div>
          
          {onlineErr&&<div style={{fontSize:'clamp(10px,2.2vw,12px)',color:'#f5a3a3'}}>{onlineErr}</div>}
          {(myGamesLoading||(myGames&&myGames.length>0))&&(<div style={{marginTop:4}}>
            <div style={{...lbl,marginBottom:6}}>Your games</div>
            {myGamesLoading&&!myGames&&<div style={{fontSize:'clamp(9.5px,2.1vw,11.5px)',color:'rgba(255,255,255,.58)'}}>Loading…</div>}
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {(myGames||[]).slice(0,8).map(g=>{
                const myC=(g.w&&g.w.uid===cloudUser.uid)?'w':'b';
                const oppNm=((myC==='w'?(g.b&&g.b.name):(g.w&&g.w.name))||'').trim()||'(waiting for opponent)';
                const mvs=g.moves||[];const turn=mvs.length%2===0?'w':'b';
                const finished=!!g.result||g.status==='over';
                const waiting=g.status==='waiting'||!(g.w&&g.b);
                const corr=g.tc&&g.tc.kind==='corr';
                const left=corr?corrDeadline(g)-corrNow:0;const myMove=!finished&&!waiting&&turn===myC;const expired=corr&&!finished&&!waiting&&left<=0;
                let sub;
                if(finished){const meWon=(g.result==='1-0'&&myC==='w')||(g.result==='0-1'&&myC==='b');sub=g.result==='1/2-1/2'?'Draw':(meWon?'You won':'You lost');}
                else if(waiting)sub='Waiting for opponent';
                else sub=(myMove?'Your move':oppNm+' to move')+(corr?(' · '+(expired?(myMove?'you are out of time':'opponent out of time'):fmtLeft(left)+' left')):'');
                const accent=finished?'rgba(255,255,255,.35)':(myMove?'#86d99a':'rgba(255,255,255,.6)');
                return(<button key={g.id} onClick={()=>resumeGame(g.id)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'9px 11px',borderRadius:11,background:myMove?'rgba(134,217,154,.1)':'rgba(255,255,255,.05)',border:'1px solid '+(myMove?'rgba(134,217,154,.35)':'rgba(255,255,255,.12)'),cursor:'pointer',textAlign:'left'}}>
                  <span style={{width:30,height:30,borderRadius:6,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,background:myC==='w'?'#eee':'#222',color:myC==='w'?'#222':'#eee',border:'1px solid rgba(255,255,255,.2)'}}>{myC==='w'?'♔':'♚'}</span>
                  <span style={{flex:1,minWidth:0}}>
                    <span style={{display:'block',fontSize:'clamp(11px,2.5vw,13px)',fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>vs {oppNm}</span>
                    <span style={{display:'block',fontSize:'clamp(8.5px,1.9vw,10.5px)',fontWeight:600,color:accent}}>{sub}</span>
                  </span>
                  <span style={{flexShrink:0,fontSize:'clamp(9px,2vw,11px)',fontWeight:800,color:'var(--ac2)'}}>{finished?'View ›':'Open ›'}</span>
                </button>);
              })}
            </div>
            <button onClick={refreshMyGames} style={{marginTop:7,alignSelf:'flex-start',padding:'8px 14px',borderRadius:12,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.16)',color:'rgba(255,255,255,.82)',cursor:'pointer',fontSize:'clamp(12px,2.7vw,14px)',fontWeight:700,minHeight:38}}>↻ Refresh</button>
          </div>)}
        </div>);
        const oppData=myColor==='w'?og.b:og.w;
        const oppName=oppData?oppData.name:'(waiting)';
        const turnLabel=og.result?'':(game.turn===myColor?'Your move':oppName+' to move');
        let resultLabel='';
        if(og.result){const meWon=(og.result==='1-0'&&myColor==='w')||(og.result==='0-1'&&myColor==='b');resultLabel=og.result==='1/2-1/2'?'½–½ Draw':(meWon?'🏆 You won!':'You lost');}
        const chat=og.chat||[];
        return(<div style={card}>
          {og.status==='waiting'?(<>
            <div style={{fontSize:'clamp(12px,2.8vw,15px)',fontWeight:800,color:'#fff',textAlign:'center'}}>Waiting for your opponent…</div>
            <div style={lbl}>Share this code with your friend</div>
            <div style={{fontSize:'clamp(28px,9vw,44px)',fontWeight:900,letterSpacing:8,textAlign:'center',color:'var(--ac2)',background:'rgba(0,0,0,.25)',borderRadius:12,padding:'10px 0'}}>{og.code||og.id}</div>
            <div style={{display:'flex',gap:8}}>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{try{const link=window.location.origin+window.location.pathname+'?g='+(og.code||og.id);navigator.clipboard.writeText(link);setOnlineInfo('Invite link copied — send it to your friend!');}catch(e){setOnlineInfo('Could not copy the link — share the code instead.');}}} style={{...btn('rgba(110,168,254,.9)','none','#0c1a33'),flex:1,fontWeight:800}}>🔗 Copy invite link</button>
              <button onClick={()=>{try{navigator.clipboard.writeText(og.code||og.id);setOnlineInfo('Code copied!');}catch(e){}}} style={btn('rgba(255,255,255,.1)','1px solid rgba(255,255,255,.2)','#fff')}>📋 Code</button>
            </div>
            <button onClick={onlineLeave} style={{...btn('rgba(236,154,144,.14)','1px solid rgba(236,154,144,.4)','#ec9a90'),width:'100%'}}>Cancel</button>
            </div>
            <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.58)',textAlign:'center',lineHeight:1.5}}>Your friend taps 🌐 Online → types this code → Join. You’re playing {myColor==='w'?'White':'Black'}.</div>
            
          </>):(<>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:'clamp(15px,3.6vw,19px)',fontWeight:800,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>vs {oppName}</div>
              </div>
              <div style={{textAlign:'right'}}>
                {og.result?<div style={{fontSize:'clamp(14px,3.4vw,18px)',fontWeight:800,color:'var(--ac2)'}}>{resultLabel}</div>
                  :<div style={{fontSize:'clamp(13px,3.1vw,16px)',fontWeight:800,color:game.turn===myColor?'#86d99a':'rgba(255,255,255,.6)'}}>{turnLabel}</div>}
              </div>
            </div>
            {og.tc&&og.tc.kind==='corr'&&!og.result&&og.status==='active'&&(()=>{
              const left=corrDeadline(og)-corrNow;const myMove=game.turn===myColor;const expired=left<=0;
              return(<div style={{background:expired?'rgba(236,154,144,.12)':'rgba(0,0,0,.22)',border:'1px solid '+(expired?'rgba(236,154,144,.4)':'rgba(255,255,255,.1)'),borderRadius:11,padding:'9px 12px',display:'flex',flexDirection:'column',gap:7}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                  <span style={{fontSize:'clamp(9.5px,2.1vw,11.5px)',color:'rgba(255,255,255,.6)',fontWeight:700}}>⏳ {og.tc.days}-day game</span>
                  <span style={{fontSize:'clamp(10px,2.4vw,12.5px)',fontWeight:800,color:expired?'#ec9a90':(myMove?'#86d99a':'rgba(255,255,255,.7)')}}>{expired?(myMove?'You are out of time':'Opponent out of time'):(fmtLeft(left)+(myMove?' left for you':' left for '+oppName))}</span>
                </div>
                {expired&&!myMove&&<button onClick={onlineClaimTime} style={{...btn('rgba(236,154,144,.2)','1px solid rgba(236,154,144,.5)','#ec9a90'),fontWeight:800}}>Claim win (opponent ran out of time)</button>}
                {!myMove&&!expired&&<div style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',color:'rgba(255,255,255,.58)',lineHeight:1.5}}>It's {oppName}'s move. You can close the app — your move is saved and the game will be waiting under “Your games”.</div>}
              </div>);
            })()}
            {og.tc&&og.tc.kind!=='corr'&&og.tc.init&&og.clk&&!og.result&&og.status==='active'&&(()=>{
              const oc=myColor==='w'?'b':'w';const base=liveNow-(og.moveAt||liveNow);
              const remOf=(side)=>Math.max(0,(og.clk[side]||0)-(side===game.turn?base:0));
              const myRem=remOf(myColor),opRem=remOf(oc);const opFlag=opRem<=0&&game.turn===oc;const myFlag=myRem<=0&&game.turn===myColor;
              const Clk=(label,ms,active)=>(<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 6px',borderRadius:11,background:active?'rgba(110,168,254,.16)':'rgba(0,0,0,.22)',border:'1px solid '+(active?'rgba(110,168,254,.45)':'rgba(255,255,255,.1)')}}><span style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',color:'rgba(255,255,255,.6)',fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'}}>{label}</span><span style={{fontFamily:'monospace',fontSize:'clamp(17px,4.6vw,23px)',fontWeight:800,color:ms<=10000?'#ec9a90':(active?'#86d99a':'#fff')}}>{clockFmt(ms)}</span></div>);
              return(<div style={{display:'flex',flexDirection:'column',gap:8}}>{opFlag&&<button onClick={onlineClaimFlag} style={{...btn('rgba(134,217,154,.2)','1px solid rgba(134,217,154,.5)','#86d99a'),width:'100%',minHeight:48,fontSize:'clamp(13px,3vw,15px)',fontWeight:800}}>Claim win ({oppName} flagged)</button>}{myFlag&&<div style={{textAlign:'center',fontSize:'clamp(10px,2.3vw,12px)',color:'#ec9a90',fontWeight:700}}>Your flag fell. Waiting for {oppName} to claim.</div>}</div>);
            })()}
            {(()=>{const drawBy=og.drawBy||null;const iOffered=drawBy&&drawBy===myColor;const oppOffered=drawBy&&drawBy!==myColor;
              const rB=og.rematchBy||null;const iReq=rB&&rB===myColor;const oppReq=rB&&rB!==myColor;
              const myNotice=(og.notice&&og.notice.for===myColor)?og.notice:null;
              const cR='#d05a52',cB='#4a89dc',cV='#6d6ac4',cG='#586273';
              const cb=(color,txt)=>({...btn(color,'none',txt||'#fff'),width:'100%',minHeight:48,fontSize:'clamp(12.5px,3vw,15px)',fontWeight:800,letterSpacing:.3});
              const acc=cb('var(--ac)','#15210a');const g2={display:'grid',gridTemplateColumns:'1fr 1fr',gap:8};
              const banner=(txt)=>(<div style={{background:'rgba(110,168,254,.16)',border:'1px solid rgba(110,168,254,.42)',borderRadius:11,padding:'10px 12px',textAlign:'center',fontSize:'clamp(12px,2.8vw,14.5px)',color:'#cfe0ff',fontWeight:800}}>{txt}</div>);
              let body;
              if(og.result){
                if(oppReq)body=(<div style={{display:'flex',flexDirection:'column',gap:8}}>{banner('🔄 '+oppName+' wants a rematch')}<div style={g2}><button onClick={onlineDeclineRematch} style={cb(cG)}>Decline</button><button onClick={onlineAcceptRematch} style={acc}>Accept</button></div></div>);
                else if(iReq)body=(<div style={{display:'flex',flexDirection:'column',gap:8}}><button disabled style={{...cb(cG),opacity:.6,cursor:'default'}}>🔄 Rematch offered…</button><div style={g2}><button onClick={onlineCancelRematch} style={cb(cG)}>Cancel</button><button onClick={onlineLeave} style={cb(cV)}>← Leave</button></div></div>);
                else body=(<div style={{display:'flex',flexDirection:'column',gap:8}}>{og.moves&&og.moves.length>=2&&<button onClick={reviewPlayedGame} style={{width:'100%',minHeight:48,borderRadius:11,border:'none',background:'linear-gradient(135deg,#6ea8fe,#3b76e8)',color:'#0a1020',fontWeight:800,fontSize:'clamp(12.5px,3vw,15px)',letterSpacing:.3,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>🔍 Review this game</button>}<button onClick={onlineOfferRematch} style={acc}>🔄 Rematch</button><div style={g2}><button onClick={()=>setFlip(f=>!f)} style={cb(cV)}>⟳ Flip</button><button onClick={onlineLeave} style={cb(cG)}>← Leave</button></div>{cloudUser&&(()=>{const ou=(myColor==='w'?(og.b&&og.b.uid):(og.w&&og.w.uid));const on2=(myColor==='w'?(og.b&&og.b.name):(og.w&&og.w.name))||'opponent';const isF=ou&&(friendsData.friends||[]).some(function(f){return f.uid===ou;});if(!ou||isF)return null;return(<button onClick={async()=>{try{await window.CTCloud.friendRequest(ou,on2);setOnlineInfo("Friend request sent to "+on2+".");}catch(e){const m=e&&e.message;setOnlineInfo(m==='pending'?("Request already sent to "+on2+"."):m==='already'?"Already friends.":"Could not send the request.");}}} style={cb(cG)}>➕ Add {on2} as friend</button>);})()}</div>);
              } else if(oppOffered){
                body=(<div style={{display:'flex',flexDirection:'column',gap:8}}>{banner('🤝 '+oppName+' offers a draw')}<div style={g2}><button onClick={onlineDeclineDraw} style={cb(cG)}>Decline</button><button onClick={onlineAcceptDraw} style={acc}>Accept ½–½</button></div></div>);
              } else if(confirmResign){
                body=(<div style={{display:'flex',flexDirection:'column',gap:8}}><div style={{textAlign:'center',fontSize:'clamp(13px,3vw,15px)',color:'#ec9a90',fontWeight:800}}>Resign this game?</div><div style={g2}><button onClick={()=>{onlineResign();setConfirmResign(false);}} style={cb(cR)}>Yes, resign</button><button onClick={()=>setConfirmResign(false)} style={cb(cG)}>Keep playing</button></div></div>);
              } else {
                body=(<div style={g2}>
                  <button onClick={()=>setConfirmResign(true)} style={cb(cR)}>🏳 Resign</button>
                  {iOffered?<button disabled style={{...cb(cG),opacity:.6,cursor:'default'}}>🤝 Offered…</button>:<button onClick={onlineOfferDraw} style={cb(cB)}>🤝 Draw</button>}
                  <button onClick={()=>setFlip(f=>!f)} style={cb(cV)}>⟳ Flip</button>
                  <button onClick={onlineLeave} style={cb(cG)}>← Leave</button>
                </div>);
              }
              return(<div style={{minHeight:104,display:'flex',flexDirection:'column',justifyContent:'center',gap:8}}>
                {myNotice&&<div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(236,154,144,.16)',border:'1px solid rgba(236,154,144,.45)',borderRadius:11,padding:'9px 12px'}}><span style={{flex:1,fontSize:'clamp(11px,2.5vw,13px)',color:'#f0b8a8',fontWeight:800}}>{myNotice.msg}</span><button onClick={onlineDismissNotice} aria-label="Dismiss" style={{background:'none',border:'none',color:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:16,lineHeight:1,padding:2}}>✕</button></div>}
                {body}
              </div>);
            })()}
            <div style={lbl}>Chat</div>
            <div style={{maxHeight:130,overflowY:'auto',display:'flex',flexDirection:'column',gap:4,background:'rgba(0,0,0,.2)',borderRadius:10,padding:'8px 10px'}}>
              {chat.length===0?<div style={{fontSize:'clamp(10.5px,2.4vw,12.5px)',color:'rgba(255,255,255,.4)'}}>Say hello 👋</div>:chat.slice(-40).map((m,i)=>(<div key={i} style={{fontSize:'clamp(11.5px,2.6vw,13.5px)',lineHeight:1.45}}><span style={{fontWeight:800,color:m.uid===cloudUser.uid?'var(--ac2)':'#86d99a'}}>{m.uid===cloudUser.uid?'You':(m.name||'Them')}: </span><span style={{color:'rgba(255,255,255,.85)'}}>{m.text}</span></div>))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onlineSendChat();}} placeholder="Message…" maxLength={240} style={{flex:1,minWidth:0,background:'rgba(0,0,0,.3)',border:'1px solid rgba(255,255,255,.18)',borderRadius:12,padding:'9px 11px',color:'#fff',fontSize:'clamp(11px,2.5vw,13px)'}}/>
              <button onClick={onlineSendChat} style={{...btn('rgba(110,168,254,.9)','none','#0c1a33'),fontWeight:800}}>Send</button>
            </div>
          </>)}
        </div>);
      })()}
      {mode==='puzzle'&&pzView==='roadmap'&&(()=>{const rank=pzRank(pzSolvedMap);const active=Math.min(rank,PZ_TIERS.length-1);const total=pzTotalSolved(pzSolvedMap);const at=PZ_TIERS[active];const inActive=pzSolvedInTier(pzSolvedMap,active);const allDone=rank>=PZ_TIERS.length;const dTd=(daily&&daily.date===dstr(new Date()))?(daily.count||0):0;return(
      <div style={{marginTop:6,width:boardPx,maxWidth:'98vw',display:'flex',flexDirection:'column',gap:10}}>
        <div style={{width:'100%',background:'rgba(var(--acr),.1)',border:'1px solid rgba(var(--acr),.3)',borderRadius:14,padding:'14px 16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontSize:34,lineHeight:1}}>{allDone?'🏆':at.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'clamp(13px,3.4vw,17px)',fontWeight:800,color:'#fff'}}>{allDone?'Journey complete!':at.name}</div>
              <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.6)',fontWeight:600}}>Rank {Math.min(rank,PZ_TIERS.length)} / {PZ_TIERS.length} · {total} solved · ⭐ {pzXP} XP</div>
            </div>
            <div style={{textAlign:'right'}}><div style={{fontSize:'clamp(13px,3vw,16px)',fontWeight:800,color:'var(--ac2)'}}>🔥 {pzStreak}</div><div style={{fontSize:'clamp(8px,1.7vw,9.5px)',color:'rgba(255,255,255,.58)'}}>best {pzBest}</div></div>
          </div>
          {!allDone&&(<div style={{marginTop:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'clamp(8.5px,1.8vw,10px)',color:'rgba(255,255,255,.55)',marginBottom:3}}><span>Progress in {at.name}</span><span>{inActive} / {at.need}</span></div>
            <div style={{width:'100%',height:8,background:'rgba(255,255,255,.1)',borderRadius:5,overflow:'hidden'}}><div style={{width:(Math.min(1,inActive/at.need)*100)+'%',height:'100%',background:'var(--ac)',borderRadius:5,transition:'width .3s'}}/></div>
          </div>)}
          <div style={{marginTop:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'clamp(8.5px,1.8vw,10px)',color:'rgba(255,255,255,.55)',marginBottom:3}}><span>📅 {dTd>=DAILY_GOAL?'Daily goal done!':'Daily goal'}{(daily&&daily.streak>0)?<span style={{color:'var(--ac2)',fontWeight:700}}> · {daily.streak}-day streak</span>:null}</span><span>{Math.min(dTd,DAILY_GOAL)} / {DAILY_GOAL}</span></div>
            <div style={{width:'100%',height:8,background:'rgba(255,255,255,.1)',borderRadius:5,overflow:'hidden'}}><div style={{width:(Math.min(1,dTd/DAILY_GOAL)*100)+'%',height:'100%',background:dTd>=DAILY_GOAL?'#6fc47a':'#f0a24e',borderRadius:5,transition:'width .3s'}}/></div>
          </div>
          <button onClick={()=>pzEnterBrowse(pzNextInTier(pzSolvedMap,active),active)} style={{...btn('var(--ac)','none','#1a1a1a'),width:'100%',marginTop:12,fontWeight:800,fontSize:'clamp(12px,2.7vw,14px)'}}>▶ {total===0?'Start training':'Train next puzzle'}</button>
        </div>
        <div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.4)',fontWeight:600,letterSpacing:.5,textAlign:'center'}}>YOUR JOURNEY · {total} / {PZ.length} SOLVED</div>
        {(()=>{const K=PZ_TIERS.length,GAP=168,NODE=96;const TC=['#7c8694','#22c55e','#14b8a6','#3b82f6','#6366f1','#a855f7','#f59e0b','#eab308'];const RW=Math.max(170,Math.min(railed?(sideW-6):Math.round(vp.w*0.92),460));const PH=(K-1)*GAP+NODE+44;const xpf=i=>i%2===0?20:80;const cxf=i=>RW*xpf(i)/100;const cyf=i=>NODE/2+i*GAP+12;
          const seg=i=>{const x1=cxf(i),y1=cyf(i),x2=cxf(i+1),y2=cyf(i+1),ym=(y1+y2)/2;return 'M '+x1+' '+y1+' C '+x1+' '+ym+' '+x2+' '+ym+' '+x2+' '+y2;};const road=(<svg width={RW} height={PH} viewBox={'0 0 '+RW+' '+PH} style={{position:'absolute',left:0,top:0,zIndex:1,pointerEvents:'none',overflow:'visible'}}>{PZ_TIERS.slice(0,K-1).map((_,i)=>(<path key={'b'+i} d={seg(i)} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="17" strokeLinecap="round"/>))}{PZ_TIERS.slice(0,K-1).map((_,i)=>{const lit=pzUnlock||(i+1)<=rank;return lit?(<path key={'l'+i} d={seg(i)} fill="none" strokeLinecap="round" pathLength="1" style={{stroke:'var(--ac)',strokeWidth:12,opacity:.9,strokeDasharray:1,strokeDashoffset:0,animation:'ctDraw .8s ease both',animationDelay:(i*.12)+'s'}}/>):null;})}{PZ_TIERS.slice(0,K-1).map((_,i)=>(<path key={'d'+i} d={seg(i)} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="0.5 13"/>))}</svg>);
          const nodes=PZ_TIERS.map((t,ti)=>{const sv=pzSolvedInTier(pzSolvedMap,ti);const done=sv>=t.need;const unlocked=pzUnlock||ti<=rank;const isActive=ti===active&&!allDone;const x=cxf(ti),y=cyf(ti);const col=TC[ti%TC.length];const bg=done?'linear-gradient(145deg,#6fc47a,#3c8348)':isActive?`linear-gradient(145deg,${col},${col})`:unlocked?`linear-gradient(145deg,${col}cc,${col}77)`:'linear-gradient(145deg,rgba(255,255,255,.10),rgba(255,255,255,.04))';return(<button key={ti} disabled={!unlocked} onClick={()=>unlocked&&pzEnterBrowse(pzNextInTier(pzSolvedMap,ti),ti)} title={t.name} style={{position:'absolute',left:x-NODE/2,top:y-NODE/2,width:NODE,height:NODE,borderRadius:'50%',zIndex:2,overflow:'visible',display:'flex',alignItems:'center',justifyContent:'center',padding:0,cursor:unlocked?'pointer':'default',opacity:unlocked?1:.6,color:'#fff',fontSize:done?29:34,lineHeight:1,background:bg,border:isActive?'3px solid #fff':'3px solid rgba(255,255,255,.45)',boxShadow:isActive?`0 5px 0 rgba(0,0,0,.30),0 0 0 6px rgba(var(--acr),.28),0 12px 22px ${col}66,inset 0 3px 4px rgba(255,255,255,.5),inset 0 -4px 8px rgba(0,0,0,.28)`:unlocked?`0 5px 0 rgba(0,0,0,.28),0 10px 20px ${col}55,inset 0 3px 4px rgba(255,255,255,.45),inset 0 -4px 8px rgba(0,0,0,.3)`:'0 3px 0 rgba(0,0,0,.3),0 4px 10px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.08)'}}>{isActive&&(<span style={{position:'absolute',inset:-9,borderRadius:'50%',boxShadow:'0 0 26px 9px '+col,opacity:.5,animation:'ctGlow 2.2s ease-in-out infinite',pointerEvents:'none'}}/>)}{unlocked&&!done&&(()=>{const D=NODE+16;const fr=Math.min(1,sv/t.need);return(<svg width={D} height={D} viewBox={'0 0 '+D+' '+D} style={{position:'absolute',left:-8,top:-8,transform:'rotate(-90deg)',pointerEvents:'none'}}><circle cx={D/2} cy={D/2} r={(NODE+9)/2} pathLength="1" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="4"/>{fr>0&&(<circle cx={D/2} cy={D/2} r={(NODE+9)/2} pathLength="1" fill="none" stroke={col} strokeWidth="4" strokeLinecap="round" strokeDasharray={fr+' '+(1-fr)} style={{transition:'stroke-dasharray .6s ease',filter:'drop-shadow(0 0 4px '+col+')'}}/>)}</svg>);})()}{done?'✓':t.icon}{!unlocked&&(<span style={{position:'absolute',top:-3,right:-3,fontSize:15,lineHeight:1,filter:'drop-shadow(0 1px 2px rgba(0,0,0,.6))'}}>🔒</span>)}<span style={{position:'absolute',top:NODE+5,left:'50%',transform:'translateX(-50%)',whiteSpace:'nowrap',fontSize:'clamp(8.5px,1.9vw,11px)',fontWeight:800,color:isActive?'var(--ac2)':done?'#86d99a':unlocked?'rgba(255,255,255,.78)':'rgba(255,255,255,.5)'}}>{t.name}</span>{unlocked&&!done&&(<span style={{position:'absolute',top:NODE+19,left:'50%',transform:'translateX(-50%)',whiteSpace:'nowrap',fontSize:'clamp(7px,1.5vw,9px)',fontWeight:600,color:'rgba(255,255,255,.5)'}}>{sv}/{t.need}</span>)}</button>);});
          return(<div style={{position:'relative',width:RW,height:PH,margin:'2px auto 4px'}}>{road}{nodes}</div>);})()}
        <button onClick={()=>pzEnterBrowse(puzIdx,null)} style={{...btn('rgba(255,255,255,.07)','1px solid rgba(255,255,255,.18)','#fff'),width:'100%'}}>🧩 Free play — browse any puzzle</button>
        <button onClick={()=>{setPzOErr('');setPzOInfo('');setPzView('online');if(!pzPack&&!(curPuz&&curPuz.ext))loadDaily();}} style={{...btn('rgba(110,168,254,.13)','1px solid rgba(110,168,254,.4)','#cfe0ff'),width:'100%'}}>🌐 Online puzzles (Lichess) — {pzOSolved} solved</button>
        {!pzUnlock?(
          <div style={{display:'flex',gap:8,alignItems:'center',marginTop:2}}>
            <input value={pzPin} onChange={e=>setPzPin(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')pzTryPin();}} placeholder="🔑 Unlock code" inputMode="numeric" style={{flex:1,minWidth:0,background:'rgba(255,255,255,.06)',border:'1px solid '+(pzPinErr?'rgba(245,120,120,.6)':'rgba(255,255,255,.15)'),borderRadius:12,padding:'9px 11px',color:'#fff',fontSize:'clamp(11px,2.5vw,13px)',outline:'none'}}/>
            <button onClick={pzTryPin} style={{...btn('rgba(255,255,255,.1)','1px solid rgba(255,255,255,.22)','#fff'),flexShrink:0,padding:'9px 15px'}}>Unlock</button>
          </div>
        ):(
          <div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'space-between',marginTop:2,background:'rgba(134,217,154,.1)',border:'1px solid rgba(134,217,154,.32)',borderRadius:12,padding:'9px 12px'}}>
            <span style={{fontSize:'clamp(10px,2.3vw,12px)',color:'#a7e8b5',fontWeight:700}}>🔓 All levels unlocked — tap any tier to train</span>
            <button onClick={pzRelock} style={{background:'none',border:'none',color:'rgba(255,255,255,.55)',fontSize:'clamp(9px,2vw,11px)',cursor:'pointer',textDecoration:'underline',padding:0,flexShrink:0}}>Lock</button>
          </div>
        )}
        {pzPinErr&&<div style={{fontSize:'clamp(9px,2vw,11px)',color:'#f5a3a3',fontWeight:600,marginTop:-2}}>{pzPinErr}</div>}
      </div>);})()}

      {/* ── Puzzle: BROWSE / solving view ── */}
      {mode==='puzzle'&&pzView==='browse'&&(()=>{const p=curPuz||PZ[puzIdx];return(
      <div style={{order:1,marginTop:11,width:boardPx,maxWidth:'98vw',display:'flex',flexDirection:'column',alignItems:'center',gap:9}}>
        {pzBurst>0&&(<div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9500}}>{Array.from({length:14}).map((_,i)=>(<span key={pzBurst+'_'+i} style={{position:'absolute',left:(8+(i*6.3)%84)+'%',top:'16%',fontSize:15+(i*7)%14,animation:'ctFall '+(0.7+(i%5)*0.12)+'s ease-in forwards',animationDelay:(i%4)*0.05+'s',opacity:.95}}>{['🎉','✨','⭐','🟡'][i%4]}</span>))}</div>)}
        <div style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <button onClick={()=>setPzView('roadmap')} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>‹ Roadmap</button>
          <span style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',color:'rgba(255,255,255,.5)',fontWeight:600}}>{pzTrainTier!=null?(PZ_TIERS[pzTrainTier].icon+' '+PZ_TIERS[pzTrainTier].name):'Free play'} · ✓ {pzTotalSolved(pzSolvedMap)}</span>
        </div>
        <div style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.5)',fontWeight:600,letterSpacing:.5}}>PUZZLE {puzIdx+1} / {PZ.length}</span>
          <span style={{fontSize:'clamp(9px,2vw,11px)',color:'var(--ac2)',fontWeight:700}}>{pzStreak>=2?('🔥 '+pzStreak+' in a row · '):''}{pzSolvedMap[p.id]?'✓ solved':('rating '+p.rating)}</span>
        </div>
        <div style={{width:'100%',background:puzSolved?'rgba(123,216,143,.12)':'rgba(var(--acr),.1)',border:`1px solid ${puzSolved?'rgba(123,216,143,.4)':'rgba(var(--acr),.3)'}`,borderRadius:12,padding:'12px 14px'}}>
          <div style={{fontSize:'clamp(14px,3.6vw,17px)',fontWeight:800,color:'#fff',marginBottom:6}}>🎯 {p.goal}</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <span style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',fontWeight:700,color:'var(--ac2)',background:'rgba(var(--acr),.16)',border:'1px solid rgba(var(--acr),.3)',borderRadius:20,padding:'2px 9px'}}>{p.motif}</span>
            <span style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',fontWeight:700,color:'rgba(255,255,255,.6)',background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.15)',borderRadius:20,padding:'2px 9px'}}>{p.level}</span>
          </div>
        </div>
        <div style={{width:'100%',height:74,overflowY:'auto'}}>{puzMsg&&(<div key={puzMsg} style={{width:'100%',fontSize:'clamp(12.5px,3vw,15px)',fontWeight:700,color:puzSolved?'#aef0bd':(puzMsg[0]==='✗'?'#ffb3a8':'#cfe0ff'),lineHeight:1.5,background:puzSolved?'rgba(123,216,143,.16)':(puzMsg[0]==='✗'?'rgba(236,154,144,.16)':'rgba(110,168,254,.14)'),border:'1px solid '+(puzSolved?'rgba(123,216,143,.45)':(puzMsg[0]==='✗'?'rgba(236,154,144,.45)':'rgba(110,168,254,.4)')),borderLeft:'4px solid '+(puzSolved?'#7bd88f':(puzMsg[0]==='✗'?'#ec9a90':'#6ea8fe')),borderRadius:10,padding:'12px 13px',animation:'pzflash .3s ease-out'}}>{puzMsg}</div>)}</div>
      </div>);})()}
      {mode==='puzzle'&&pzView==='browse'&&(()=>{const p=curPuz||PZ[puzIdx];return(
      <div style={{order:3,marginTop:9,width:boardPx,maxWidth:'98vw',display:'flex',flexDirection:'column',alignItems:'center',gap:9}}>
        {!puzSolved&&(<div style={{display:'flex',gap:7,flexWrap:'wrap',justifyContent:'center'}}>
          <button onClick={()=>setPuzMsg('💡 '+p.hint)} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>💡 Hint</button>
          <button onClick={()=>{setPuzReveal(true);setPuzMsg('👁 Play '+p.sol[puzStep]+' — the squares are highlighted on the board.');}} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>👁 Show move</button>
          <button onClick={()=>loadPuzzle(puzIdx)} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>↺ Reset</button>
        </div>)}
        <div style={{display:'flex',gap:7,width:'100%'}}>
          <button onClick={()=>loadPuzzle(puzIdx-1)} style={navBtn(false)}>‹ Prev</button>
          <button onClick={()=>{if(pzTrainTierRef.current!=null)loadPuzzle(pzNextInTier(pzSolvedRef.current,pzTrainTierRef.current));else loadPuzzle(puzIdx+1);}} style={navBtn(puzSolved)}>Next ›</button>
        </div>
      </div>);})()}

      {/* ── Puzzle: ONLINE (Lichess) view ── */}
      {mode==='puzzle'&&pzView==='online'&&(()=>{const p=(curPuz&&curPuz.ext)?curPuz:null;const bw=Math.min(boardPx,440);return(
      <div style={{order:1,marginTop:p?11:6,width:bw,maxWidth:'98vw',display:'flex',flexDirection:'column',alignItems:'stretch',gap:9}}>
        <div style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <button onClick={()=>setPzView('roadmap')} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>‹ Roadmap</button>
          <span style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',color:'rgba(255,255,255,.5)',fontWeight:600}}>🌐 Lichess · ✓ {pzOSolved} solved</span>
        </div>
        <div style={{width:'100%',background:'rgba(110,168,254,.09)',border:'1px solid rgba(110,168,254,.28)',borderRadius:12,padding:'11px 12px',display:'flex',flexDirection:'column',gap:8}}>
          <button disabled={pzOLoading} onClick={loadDaily} style={{...btn('rgba(110,168,254,.9)','none','#0c1a33'),width:'100%',fontWeight:800}}>📅 Lichess Daily Puzzle</button>
          {pzUnlock&&(<>
          <div style={{display:'flex',gap:6}}>
            <input value={pzIdInput} onChange={e=>setPzIdInput(e.target.value)} placeholder="puzzle ID (e.g. tHj5w)" style={{flex:1,minWidth:0,background:'rgba(0,0,0,.3)',border:'1px solid rgba(255,255,255,.15)',borderRadius:8,padding:'8px 10px',color:'#fff',fontSize:'clamp(11px,2.4vw,13px)'}}/>
            <button disabled={pzOLoading} onClick={()=>loadById(pzIdInput)} style={btn('rgba(255,255,255,.1)','1px solid rgba(255,255,255,.2)','#fff')}>Open</button>
          </div>
          <div style={{display:'flex',gap:6}}>
            <input value={pzPackUrl} onChange={e=>setPzPackUrl(e.target.value)} placeholder="puzzle pack URL (.json)" style={{flex:1,minWidth:0,background:'rgba(0,0,0,.3)',border:'1px solid rgba(255,255,255,.15)',borderRadius:8,padding:'8px 10px',color:'#fff',fontSize:'clamp(11px,2.4vw,13px)'}}/>
            <button disabled={pzOLoading} onClick={()=>loadPack(pzPackUrl)} style={btn('rgba(255,255,255,.1)','1px solid rgba(255,255,255,.2)','#fff')}>Load</button>
          </div>
          <div style={{fontSize:'clamp(8px,1.7vw,9.5px)',color:'rgba(255,255,255,.4)',lineHeight:1.5}}>Dev tools: load a specific Lichess puzzle by ID, or a hosted pack (.json).</div>
          </>)}
        </div>
        {pzPack&&(<div style={{display:'flex',gap:5,alignItems:'center'}}>
          <span style={{fontSize:'clamp(8.5px,1.8vw,10px)',color:'rgba(255,255,255,.5)',fontWeight:600,marginRight:2}}>Level</span>
          {[['any','All'],['easy','Easier'],['med','Medium'],['hard','Harder']].map(([v,lbl])=>(
            <button key={v} onClick={()=>{pzDiffRef.current=v;setPzDiff(v);showPackIdx(pzPack,pzPackIdx);}} style={{flex:1,fontSize:'clamp(8.5px,1.9vw,10.5px)',fontWeight:700,padding:'6px 3px',borderRadius:8,cursor:'pointer',border:'1px solid '+(pzDiff===v?'rgba(110,168,254,.5)':'rgba(255,255,255,.14)'),background:pzDiff===v?'rgba(110,168,254,.22)':'rgba(255,255,255,.05)',color:pzDiff===v?'#cfe0ff':'rgba(255,255,255,.7)'}}>{lbl}</button>
          ))}
        </div>)}
        {pzOErr&&(<div style={{width:'100%',fontSize:'clamp(9.5px,2.1vw,11.5px)',fontWeight:600,color:'#ec9a90',lineHeight:1.5,background:'rgba(236,154,144,.08)',border:'1px solid rgba(236,154,144,.25)',borderRadius:12,padding:'9px 11px'}}>{pzOErr}</div>)}
        {!pzOErr&&pzOInfo&&p&&(<div style={{fontSize:'clamp(9px,2vw,11px)',color:'rgba(255,255,255,.55)',fontWeight:600,textAlign:'center'}}>{pzOInfo}</div>)}
        {p&&(<>
          <div style={{width:'100%',background:puzSolved?'rgba(123,216,143,.12)':'rgba(110,168,254,.1)',border:`1px solid ${puzSolved?'rgba(123,216,143,.4)':'rgba(110,168,254,.3)'}`,borderRadius:12,padding:'12px 14px'}}>
            <div style={{fontSize:'clamp(14px,3.6vw,17px)',fontWeight:800,color:'#fff',marginBottom:6}}>🎯 {p.goal}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <span style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',fontWeight:700,color:'#cfe0ff',background:'rgba(110,168,254,.16)',border:'1px solid rgba(110,168,254,.3)',borderRadius:20,padding:'2px 9px'}}>{p.motif}</span>
              <span style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',fontWeight:700,color:'rgba(255,255,255,.6)',background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.15)',borderRadius:20,padding:'2px 9px'}}>{p.level}{p.rating?(' · '+p.rating):''}</span>
              {pzOSolvedIds[p.id]&&(<span style={{fontSize:'clamp(8.5px,1.9vw,10.5px)',fontWeight:700,color:'#86d99a',background:'rgba(123,216,143,.13)',border:'1px solid rgba(123,216,143,.35)',borderRadius:20,padding:'2px 9px'}}>✓ solved before</span>)}
            </div>
          </div>
          <div style={{width:'100%',height:74,overflowY:'auto'}}>{puzMsg&&(<div key={puzMsg} style={{width:'100%',fontSize:'clamp(12.5px,3vw,15px)',fontWeight:700,color:puzSolved?'#aef0bd':(puzMsg[0]==='✗'?'#ffb3a8':'#cfe0ff'),lineHeight:1.5,background:puzSolved?'rgba(123,216,143,.16)':(puzMsg[0]==='✗'?'rgba(236,154,144,.16)':'rgba(110,168,254,.14)'),border:'1px solid '+(puzSolved?'rgba(123,216,143,.45)':(puzMsg[0]==='✗'?'rgba(236,154,144,.45)':'rgba(110,168,254,.4)')),borderLeft:'4px solid '+(puzSolved?'#7bd88f':(puzMsg[0]==='✗'?'#ec9a90':'#6ea8fe')),borderRadius:10,padding:'12px 13px',animation:'pzflash .3s ease-out'}}>{puzMsg}</div>)}</div>
        </>)}
      </div>);})()}
      {mode==='puzzle'&&pzView==='online'&&(()=>{const p=(curPuz&&curPuz.ext)?curPuz:null;const bw=Math.min(boardPx,440);return(p&&(
      <div style={{order:3,marginTop:9,width:bw,maxWidth:'98vw',display:'flex',flexDirection:'column',alignItems:'stretch',gap:9}}>
        {!puzSolved&&(<div style={{display:'flex',gap:7,flexWrap:'wrap',justifyContent:'center'}}>
          <button onClick={()=>setPuzMsg('💡 '+p.hint)} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>💡 Hint</button>
          <button onClick={()=>{setPuzReveal(true);setPuzMsg('👁 Play '+p.sol[puzStep]+' — the squares are highlighted on the board.');}} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>👁 Show move</button>
          <button onClick={()=>loadExternal(curPuz)} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>↺ Reset</button>
        </div>)}
        <div style={{display:'flex',gap:7,width:'100%',alignItems:'center'}}>
          {mistakeMode?(<button onClick={exitMistakes} style={navBtn(false)}>‹ Review</button>):(p.url&&(<a href={p.url} target="_blank" rel="noopener noreferrer" style={{...navBtn(false),textDecoration:'none'}}>↗ Lichess</a>))}
          <button onClick={nextOnline} style={navBtn(puzSolved)}>{mistakeMode?'Next ›':(pzPack?'Next ›':'New daily ›')}</button>
        </div>
      </div>));})()}

      <style>{`@keyframes pzpop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes pzbounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}@keyframes pzfloat{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(70px) rotate(45deg);opacity:0}}@keyframes pzflash{0%{transform:scale(.97);opacity:.45}100%{transform:scale(1);opacity:1}}`}</style>

      {pzCelebrate&&(<div onClick={()=>setPzCelebrate(null)} style={{position:'fixed',inset:0,background:'rgba(8,10,20,.74)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:80,padding:20}}>
        <div onClick={e=>e.stopPropagation()} style={{position:'relative',textAlign:'center',background:'linear-gradient(160deg,rgba(44,48,78,.98),rgba(20,22,38,.98))',border:'1px solid rgba(var(--acr),.55)',borderRadius:22,padding:'30px 26px',maxWidth:360,width:'100%',boxShadow:'0 18px 64px rgba(0,0,0,.55)',animation:'pzpop .45s cubic-bezier(.18,1.35,.5,1)',overflow:'hidden'}}>
          {['🎉','✨','🎊','⭐','🎉','✨'].map((e,i)=>(<span key={i} style={{position:'absolute',top:-6,left:(6+i*16)+'%',fontSize:22,animation:'pzfloat 1.5s ease-out '+(i*0.12)+'s infinite'}}>{e}</span>))}
          <div style={{fontSize:66,lineHeight:1,margin:'6px 0 4px',animation:'pzbounce 1s ease-in-out infinite'}}>{pzCelebrate.icon}</div>
          <div style={{fontSize:'clamp(11px,2.7vw,13px)',fontWeight:800,letterSpacing:3,color:'var(--ac2)'}}>RANK UP!</div>
          <div style={{fontSize:'clamp(23px,6.5vw,32px)',fontWeight:900,color:'#fff',margin:'1px 0 5px'}}>{pzCelebrate.name}</div>
          <div style={{fontSize:'clamp(11px,2.7vw,13px)',color:'rgba(255,255,255,.72)',marginBottom:18,lineHeight:1.5}}>You've climbed to a new rank. Keep solving to reach the next one!</div>
          <button onClick={()=>setPzCelebrate(null)} style={{...btn('var(--ac)','none','#1a1a1a'),width:'100%',fontWeight:800,fontSize:'clamp(13px,3vw,15px)'}}>Continue ▶</button>
        </div>
      </div>)}

      {promo&&(()=>{const col=promo.g.turn;const gl={w:{q:'♕',r:'♖',b:'♗',n:'♘'},b:{q:'♛',r:'♜',b:'♝',n:'♞'}}[col];return(
      <div onClick={()=>setPromo(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:16}}>
        <div onClick={e=>e.stopPropagation()} style={{background:'#1f1f30',border:'1px solid rgba(255,255,255,.18)',borderRadius:16,padding:'16px 18px',textAlign:'center',boxShadow:'0 16px 50px rgba(0,0,0,.65)'}}>
          <div style={{fontSize:'clamp(11px,2.6vw,13.5px)',fontWeight:800,color:'var(--ac2)',marginBottom:12,letterSpacing:.3}}>Promote to…</div>
          <div style={{display:'flex',gap:9}}>
            {['q','r','b','n'].map(pt=>(
              <button key={pt} onClick={()=>{const m=promo.choices.find(x=>x.promo===pt);setPromo(null);if(m)doMove(promo.g,m);}} style={{width:52,height:52,borderRadius:12,background:'rgba(var(--acr),.14)',border:'1px solid rgba(var(--acr),.32)',cursor:'pointer',fontSize:30,lineHeight:1,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>{gl[pt]}</button>
            ))}
          </div>
        </div>
      </div>);})()}

      {/* ── Learn controls ── */}
      {mode==='learn'&&(<div style={{marginTop:11,width:boardPx,maxWidth:'98vw',display:'flex',flexDirection:'column',alignItems:'center',gap:9}}>{kpInfo&&openIdx!==null&&(<div style={{width:'100%',display:'flex',flexDirection:'column',gap:6}}><button onClick={()=>setSqShow(v=>!v)} style={{...btn('rgba(110,168,254,.14)','1px solid rgba(110,168,254,.45)','#cfe0ff'),width:'100%',fontSize:'clamp(11px,2.5vw,13px)'}}>{sqShow?'Hide the square':'Show the square of the pawn'}</button>{sqShow&&(<div style={{fontSize:'clamp(11px,2.6vw,13px)',textAlign:'center',padding:'7px 10px',borderRadius:9,background:kpInfo.catches?'rgba(110,214,110,.14)':'rgba(255,170,60,.14)',border:'1px solid '+(kpInfo.catches?'rgba(110,214,110,.5)':'rgba(255,170,60,.5)'),color:'#fff',lineHeight:1.4}}>{kpInfo.catches?'The king is inside the square, so it catches the pawn.':'The king is outside the square, so the pawn promotes.'}</div>)}</div>)}
        {openIdx!==null?(
          (()=>{const grp=groupOf(LIB[openIdx].cat);const noun=grp==='endgames'?'endgames':grp==='gambits'?'gambits':'openings';const idxs=LIB.map((o,i)=>groupOf(o.cat)===grp?i:-1).filter(i=>i>=0);const pos=idxs.indexOf(openIdx);const hasPrev=pos>0,hasNext=pos<idxs.length-1;
            const nav=(on)=>({...btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff'),opacity:on?1:.35,cursor:on?'pointer':'default'});
            return learnPhase==='practice'?null:(<div style={{display:'flex',gap:7,width:'100%',alignSelf:'stretch'}}><button onClick={()=>{if(hasPrev)selectOpening(idxs[pos-1]);}} disabled={!hasPrev} style={{...nav(hasPrev),flex:'0 0 auto',padding:'0 13px',fontSize:'clamp(11px,2.5vw,13px)'}}>‹ Prev</button><button onClick={()=>setOpenIdx(null)} style={{...btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','rgba(255,255,255,.85)'),flex:1,fontSize:'clamp(11px,2.5vw,13px)'}}>All {noun}</button><button onClick={()=>{if(hasNext)selectOpening(idxs[pos+1]);}} disabled={!hasNext} style={{...nav(hasNext),flex:'0 0 auto',padding:'0 13px',fontSize:'clamp(11px,2.5vw,13px)'}}>Next ›</button></div>);})()
        ):learnGroup===null?(
          <div style={{width:'100%'}}>
            <div style={{textAlign:'center',marginBottom:16}}>
              <div style={{fontFamily:"var(--head)",fontSize:'clamp(20px,5.2vw,28px)',color:'#fff',fontWeight:700,letterSpacing:.3,lineHeight:1.12}}>What do you want to learn?</div>
              <div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'rgba(255,255,255,.5)',marginTop:4}}>{LIB.length} lessons, taught move by move</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:11}}>
              {[{key:'openings',label:'Openings',icon:'🚀',blurb:'Real openings for White & Black',tint:['#3b82f6','#1d4ed8']},{key:'gambits',label:'Gambits & Traps',icon:'⚔️',blurb:'Sacrifices, attacks & classic traps',tint:['#ef4444','#b91c1c']},{key:'endgames',label:'Endgames',icon:'👑',blurb:'Key winning technique & theory',tint:['#a855f7','#7c3aed']}].map((grp,gi)=>{
                const n=LIB.filter(o=>groupOf(o.cat)===grp.key).length;
                if(!n)return null;
                return(
                <button key={grp.key} onClick={()=>setLearnGroup(grp.key)} style={{display:'flex',alignItems:'center',gap:15,width:'100%',padding:'20px 16px',borderRadius:18,background:`linear-gradient(135deg,rgba(255,255,255,.08),rgba(${TH.rgb},.04))`,border:'1px solid rgba(255,255,255,.14)',color:'#fff',cursor:'pointer',fontFamily:"'Segoe UI',system-ui,sans-serif",textAlign:'left',boxShadow:SHADOW_CARD}}>
                  <span style={{flexShrink:0,width:58,height:58,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',background:`linear-gradient(150deg,${grp.tint[0]},${grp.tint[1]})`,boxShadow:`0 6px 16px ${grp.tint[1]}66,inset 0 1px 0 rgba(255,255,255,.4)`,fontSize:30,lineHeight:1,animation:'iconpop .55s cubic-bezier(.34,1.56,.64,1) both',animationDelay:`${gi*0.09}s`}}>{grp.icon}</span>
                  <span style={{flex:1,minWidth:0}}>
                    <span style={{display:'block',fontSize:'clamp(15px,3.7vw,19px)',fontWeight:800,marginBottom:3}}>{grp.label}</span>
                    <span style={{display:'block',fontSize:'clamp(10px,2.3vw,12.5px)',color:'rgba(255,255,255,.6)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{grp.blurb}</span>
                  </span>
                  <span style={{flexShrink:0,fontSize:'clamp(11px,2.5vw,13px)',fontWeight:800,color:'var(--ac2)',background:'rgba(var(--acr),.16)',border:'1px solid rgba(var(--acr),.3)',borderRadius:20,padding:'4px 11px'}}>{n}</span>
                  <span style={{flexShrink:0,fontSize:20,color:'var(--ac2)',opacity:.6}}>›</span>
                </button>);})}
              <button onClick={()=>setLearnGroup('tactics')} style={{display:'flex',alignItems:'center',gap:15,width:'100%',padding:'20px 16px',borderRadius:18,background:'linear-gradient(135deg,rgba(255,255,255,.08),rgba(16,185,129,.06))',border:'1px solid rgba(255,255,255,.14)',color:'#fff',cursor:'pointer',fontFamily:"'Segoe UI',system-ui,sans-serif",textAlign:'left',boxShadow:SHADOW_CARD}}>
                <span style={{flexShrink:0,width:58,height:58,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(150deg,#10b981,#047857)',boxShadow:'0 6px 16px rgba(4,120,87,.5),inset 0 1px 0 rgba(255,255,255,.4)',fontSize:30,lineHeight:1}}>💡</span>
                <span style={{flex:1,minWidth:0}}>
                  <span style={{display:'block',fontSize:'clamp(15px,3.7vw,19px)',fontWeight:800,marginBottom:3}}>Tactics & Strategy</span>
                  <span style={{display:'block',fontSize:'clamp(10px,2.3vw,12.5px)',color:'rgba(255,255,255,.6)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Motifs, patterns & key ideas</span>
                </span>
                <span style={{flexShrink:0,fontSize:'clamp(9px,2vw,11px)',fontWeight:800,color:'#6fce97',background:'rgba(16,185,129,.16)',border:'1px solid rgba(16,185,129,.4)',borderRadius:20,padding:'3px 9px'}}>New</span>
                <span style={{flexShrink:0,fontSize:20,color:'var(--ac2)',opacity:.6}}>›</span>
              </button>
            </div>
          </div>
        ):learnGroup==='notation'?(
          <div style={{width:'100%'}}>
            <button onClick={()=>setLearnGroup(null)} style={{padding:'7px 12px',borderRadius:12,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.2)',color:'rgba(255,255,255,.85)',cursor:'pointer',fontSize:'clamp(10px,2.3vw,12px)',fontWeight:600,marginBottom:12}}>‹ Back</button>
            <NotationTrainer light={TH.light} dark={TH.dark}/>
          </div>
        ):learnGroup==='tactics'?(
          <div style={{width:'100%'}}>
            <button onClick={()=>setLearnGroup(null)} style={{padding:'7px 12px',borderRadius:12,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.2)',color:'rgba(255,255,255,.85)',cursor:'pointer',fontSize:'clamp(10px,2.3vw,12px)',fontWeight:600,marginBottom:12}}>‹ Back</button>
            <TacticsTrainer light={TH.light} dark={TH.dark}/>
          </div>
        ):learnGroup==='train'?((()=>{
          const trainable=LIB.map((o,i)=>i).filter(i=>{const g=groupOf(LIB[i].cat);return g==='openings'||g==='gambits';});
          const learnedCount=trainable.filter(i=>{const m=trainMastery[LIB[i].name];return m&&m.learned;}).length;
          const total=trainable.length;
          const dueIdx=trainable.filter(i=>{const m=trainMastery[LIB[i].name];return m&&m.learned&&Date.now()>(m.due||0);});
          const repNames=['Italian Game','London System','Caro-Kann Defense',"King's Indian Defense"];
          const repIdx=repNames.map(n=>LIB.findIndex(o=>o.name===n)).filter(i=>i>=0);
          const statusOf=(i)=>{const _st=lessonStats(LIB[i]);if(_st.mastered)return {t:'\u2605 Mastered',c:'#f0c24d'};if(_st.coverage)return {t:'Learned \u2713 \u00b7 '+_st.unionDays+'/'+LEARN_GOAL+' days to master',c:'#6cc78a'};if(_st.linesLearned>0)return {t:'In progress \u00b7 '+_st.linesLearned+'/'+_st.lines+' lines learned',c:'#9fd0ff'};const m=trainMastery[LIB[i].name];if(!m||!m.learned)return {t:'Not started',c:'rgba(255,255,255,.55)'};if(Date.now()>(m.due||0))return {t:'Review due',c:'#e0a83a'};return {t:'Learned ✓',c:'#46b96a'};};
          const row=(i)=>{const op=LIB[i];const st=statusOf(i);return(<button key={i} onClick={()=>selectOpening(i)} style={{display:'flex',alignItems:'center',gap:11,width:'100%',padding:'11px 12px',borderRadius:11,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',color:'#fff',cursor:'pointer',textAlign:'left',boxShadow:SHADOW_BTN,fontFamily:'"Segoe UI",system-ui,sans-serif'}}><span style={{flexShrink:0,width:34,height:34,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',background:op.side==='w'?'linear-gradient(145deg,#f4f6fb,#cfd6e2)':'linear-gradient(145deg,#3a4150,#1c2029)',border:'1px solid rgba(255,255,255,.18)',fontSize:18,color:op.side==='w'?'#1a1d24':'#fff'}}>{op.side==='w'?'♔':'♚'}</span><span style={{flex:1,minWidth:0}}><span style={{display:'block',fontSize:'clamp(12px,2.7vw,14px)',fontWeight:700}}>{op.name}</span><span style={{display:'block',fontSize:'clamp(8.5px,2vw,10.5px)',color:st.c,fontWeight:700}}>{st.t}</span></span><span style={{flexShrink:0,fontSize:18,color:'var(--ac2)',opacity:.6}}>›</span></button>);};
          const sec=(t)=>(<div style={{fontSize:'clamp(9.5px,2.2vw,11.5px)',fontWeight:800,letterSpacing:.4,color:'var(--ac2)',textTransform:'uppercase',margin:'14px 3px 7px'}}>{t}</div>);
          const fmK=op=>{const f=op.line&&op.line[0];return f==='e4'?'e4':f==='d4'?'d4':'other';};
          const buckets=[{lab:'White · 1.e4',side:'w',fk:'e4'},{lab:'White · 1.d4',side:'w',fk:'d4'},{lab:'White · other',side:'w',fk:'other'},{lab:'Black · vs 1.e4',side:'b',fk:'e4'},{lab:'Black · vs 1.d4',side:'b',fk:'d4'},{lab:'Black · other',side:'b',fk:'other'}].map(b=>{const idxs=LIB.map((o,i)=>i).filter(i=>groupOf(LIB[i].cat)==='openings'&&LIB[i].side===b.side&&fmK(LIB[i])===b.fk);const learned=idxs.filter(i=>{const m=trainMastery[LIB[i].name];return m&&m.learned;}).length;return {...b,idxs,learned,total:idxs.length};}).filter(b=>b.total>0);
          const recFor={'w|e4':'Italian Game','w|d4':'London System','b|e4':'Caro-Kann Defense','b|d4':"King's Indian Defense"};
          let gapPick=null;for(const k of ['w|e4','w|d4','b|e4','b|d4']){const sd=k[0],fk=k.slice(2);const b=buckets.find(x=>x.side===sd&&x.fk===fk);if(b&&b.learned===0){const ri=LIB.findIndex(o=>o.name===recFor[k]);gapPick={lab:b.lab,idx:(ri>=0&&b.idxs.includes(ri))?ri:b.idxs[0]};break;}}
          const ros=realOpeningStats;const realN=ros?ros.n:0;
          buckets.forEach(b=>{const r=ros&&ros.byBucket[b.side+'|'+b.fk];b.real=r?{games:r.games,score:(r.win+0.5*r.draw)/r.games}:null;});
          let realGap=null;
          if(ros){const playable=ros.openings.filter(o=>o.games>=3&&LIB.some(x=>x.name===o.name)).sort((a,b)=>a.score-b.score);if(playable.length){const w=playable[0];realGap={lab:w.name,idx:LIB.findIndex(x=>x.name===w.name),score:w.score,games:w.games,opening:true};}}
          if(!realGap){const cand=buckets.filter(b=>b.real&&b.real.games>=3).sort((a,b)=>a.real.score-b.real.score);if(cand.length){const w=cand[0];const k=w.side+'|'+w.fk;const ri=LIB.findIndex(o=>o.name===recFor[k]);realGap={lab:w.lab,idx:(ri>=0&&w.idxs.includes(ri))?ri:w.idxs[0],score:w.real.score,games:w.real.games};}}
          const cta=realGap||gapPick;
          const playedOpenings=ros?ros.openings:[];
          return(<div style={{width:'100%'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:13}}>
              <button onClick={()=>setLearnGroup(null)} style={{padding:'7px 12px',borderRadius:12,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.2)',color:'rgba(255,255,255,.85)',cursor:'pointer',fontSize:'clamp(10px,2.3vw,12px)',fontWeight:600,whiteSpace:'nowrap',flexShrink:0}}>‹ Back</button>
              <span style={{fontSize:'clamp(21px,5vw,27px)',lineHeight:1,flexShrink:0}}>🎯</span><span style={{fontSize:'clamp(18px,4.4vw,23px)',fontWeight:800,color:'#fff',letterSpacing:.2,fontFamily:"var(--head)"}}>Train</span>
              <span style={{marginLeft:'auto',fontSize:'clamp(10px,2.4vw,12.5px)',fontWeight:800,color:'var(--ac2)',background:'rgba(var(--acr),.16)',border:'1px solid rgba(var(--acr),.3)',borderRadius:20,padding:'3px 11px',flexShrink:0}}>{learnedCount}/{total}</span>
            </div>
            <div style={{width:'100%',height:9,borderRadius:6,background:'rgba(255,255,255,.08)',overflow:'hidden',marginBottom:5}}><div style={{width:`${total?Math.round(learnedCount/total*100):0}%`,height:'100%',background:'linear-gradient(90deg,var(--ac),var(--ac2))',borderRadius:6}}/></div>
            <div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'rgba(255,255,255,.6)',textAlign:'center'}}>{learnedCount===0?'Tap an opening below, watch it, then drill it with move choices.':`${learnedCount} learned${dueIdx.length?` · ${dueIdx.length} due for review`:''}`}</div>
            {dueIdx.length>0&&(<>{sec('Due for review')}<div style={{display:'flex',flexDirection:'column',gap:7}}>{dueIdx.map(row)}</div></>)}
            {sec('Your coverage')}
            <div style={{fontSize:'clamp(9px,2.1vw,11px)',color:'rgba(255,255,255,.5)',margin:'-3px 3px 7px',lineHeight:1.4}}>{ccGames?`Based on ${realN} of your loaded games, plus what you've drilled.`:'Showing what you have drilled. Open Review and load your games to also see where you actually score worst.'}</div>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {buckets.map((b,bi)=>(<div key={bi} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 11px',borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)'}}>
                <span style={{flex:1,minWidth:0}}>
                  <span style={{display:'flex',alignItems:'center',gap:7,fontSize:'clamp(11px,2.5vw,13px)',fontWeight:700,flexWrap:'wrap'}}>{b.lab}{b.learned===0&&<span style={{fontSize:'clamp(7.5px,1.8vw,9px)',fontWeight:800,color:'#e0a83a',background:'rgba(224,168,58,.16)',border:'1px solid rgba(224,168,58,.45)',borderRadius:20,padding:'1px 7px'}}>GAP</span>}{b.real&&(()=>{const pct=Math.round(b.real.score*100);const col=pct<45?'#ec8a82':pct<55?'#e0a83a':'#6cc78a';return(<span style={{fontSize:'clamp(8px,1.9vw,10px)',fontWeight:800,color:col}}>{b.real.games}g · {pct}%</span>);})()}</span>
                  <span style={{display:'block',height:6,borderRadius:4,background:'rgba(255,255,255,.09)',overflow:'hidden',marginTop:5}}><span style={{display:'block',width:`${b.total?Math.round(b.learned/b.total*100):0}%`,height:'100%',background:b.learned===0?'#e0a83a':'linear-gradient(90deg,var(--ac),var(--ac2))'}}/></span>
                </span>
                <span style={{flexShrink:0,fontSize:'clamp(9.5px,2.2vw,11.5px)',fontWeight:800,color:'rgba(255,255,255,.7)'}}>{b.learned}/{b.total}</span>
              </div>))}
            </div>
            {cta&&<button onClick={()=>selectOpening(cta.idx)} style={{display:'flex',alignItems:'center',gap:11,width:'100%',marginTop:9,padding:'12px 13px',borderRadius:12,background:'linear-gradient(135deg,rgba(224,168,58,.2),rgba(224,168,58,.06))',border:'1px solid rgba(224,168,58,.45)',color:'#fff',cursor:'pointer',textAlign:'left',boxShadow:SHADOW_BOX}}><span style={{flexShrink:0,fontSize:24,lineHeight:1}}>🧩</span><span style={{flex:1,minWidth:0}}><span style={{display:'block',fontSize:'clamp(9px,2.1vw,11px)',color:'#e9bd6a',fontWeight:800,letterSpacing:.4,textTransform:'uppercase'}}>{realGap?`Your weak spot · ${Math.round(realGap.score*100)}% over ${realGap.games} games`:'Fill your biggest gap'}</span><span style={{display:'block',fontSize:'clamp(13px,3vw,15px)',fontWeight:800,marginTop:1}}>{LIB[cta.idx].name}{(!cta.opening&&cta.lab)?<span style={{color:'rgba(255,255,255,.6)',fontWeight:600}}> · {cta.lab}</span>:null}</span></span><span style={{flexShrink:0,fontSize:20,color:'#e9bd6a'}}>›</span></button>}
            {playedOpenings.length>0&&(<>{sec('From your games')}
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {playedOpenings.slice(0,7).map((o,oi)=>{const li=LIB.findIndex(x=>x.name===o.name);const tap=li>=0;const side=tap?LIB[li].side:null;const pct=Math.round(o.score*100);const col=pct<45?'#ec8a82':pct<55?'#e0a83a':'#6cc78a';return(<button key={oi} disabled={!tap} onClick={()=>tap&&selectOpening(li)} style={{display:'flex',alignItems:'center',gap:11,width:'100%',padding:'10px 12px',borderRadius:11,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',color:'#fff',cursor:tap?'pointer':'default',textAlign:'left',boxShadow:tap?SHADOW_BTN:'none',opacity:tap?1:.7,fontFamily:'"Segoe UI",system-ui,sans-serif'}}><span style={{flexShrink:0,width:30,height:30,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:side==='b'?'linear-gradient(145deg,#3a4150,#1c2029)':'linear-gradient(145deg,#f4f6fb,#cfd6e2)',border:'1px solid rgba(255,255,255,.18)',fontSize:16,color:side==='b'?'#fff':'#1a1d24'}}>{side==='b'?'♚':'♔'}</span><span style={{flex:1,minWidth:0}}><span style={{display:'block',fontSize:'clamp(11px,2.5vw,13px)',fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{o.name}</span><span style={{display:'block',fontSize:'clamp(8.5px,2vw,10.5px)',color:'rgba(255,255,255,.5)'}}>{tap?'Tap to drill':'Not in the library yet'}</span></span><span style={{flexShrink:0,fontSize:'clamp(10px,2.3vw,12px)',fontWeight:800,color:col}}>{o.games}g · {pct}%</span></button>);})}
            </div></>)}
            {sec('Recommended repertoire')}
            <div style={{display:'flex',flexDirection:'column',gap:7}}>{repIdx.map(row)}</div>
            <button onClick={()=>setLearnGroup('openings')} style={{...btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','rgba(255,255,255,.85)'),width:'100%',marginTop:14}}>Browse all openings ›</button>
          </div>);
        })()):(
          <div style={{width:'100%'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:13}}>
              <button onClick={()=>setLearnGroup(null)} style={{padding:'7px 12px',borderRadius:12,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.2)',color:'rgba(255,255,255,.85)',cursor:'pointer',fontSize:'clamp(10px,2.3vw,12px)',fontWeight:600,whiteSpace:'nowrap',flexShrink:0}}>‹ Back</button>
              {(()=>{const g={openings:{t:'Openings',ic:'🚀'},gambits:{t:'Gambits & Traps',ic:'⚔️'},endgames:{t:'Endgames',ic:'👑'}}[learnGroup];const gn=LIB.filter(o=>groupOf(o.cat)===learnGroup).length;return(<><span style={{fontSize:'clamp(21px,5vw,27px)',lineHeight:1,flexShrink:0}}>{g.ic}</span><span style={{fontSize:'clamp(18px,4.4vw,23px)',fontWeight:800,color:'#fff',letterSpacing:.2,fontFamily:"var(--head)"}}>{g.t}</span><span style={{marginLeft:'auto',fontSize:'clamp(10px,2.4vw,12.5px)',fontWeight:800,color:'var(--ac2)',background:'rgba(var(--acr),.16)',border:'1px solid rgba(var(--acr),.3)',borderRadius:20,padding:'3px 11px',flexShrink:0}}>{gn}</span></>);})()}
            </div>
            {(()=>{
              const fmKey=op=>{const f=op.line&&op.line[0];return f==='e4'?'e4':f==='d4'?'d4':'other';};
              const idxsBy=(pred)=>LIB.map((op,i)=>pred(op,i)?i:-1).filter(i=>i>=0);
              let groups=[];
              if(learnGroup==='openings'){
                const subW={e4:'After King\u2019s Pawn (1.e4)',d4:'After Queen\u2019s Pawn (1.d4)',other:'Other first moves'};
                const subB={e4:'Defences to 1.e4 (King\u2019s Pawn)',d4:'Defences to 1.d4 (Queen\u2019s Pawn)',other:'Other defences'};
                [['w','\u2654  White\u2019s openings',true,subW],['b','\u265A  Black\u2019s openings',false,subB]].forEach(([side,htxt,w,subL])=>{
                  const subs=['e4','d4','other'].map(k=>({label:subL[k],idxs:idxsBy(op=>groupOf(op.cat)==='openings'&&op.side===side&&fmKey(op)===k)})).filter(s=>s.idxs.length);
                  if(subs.length)groups.push({head:{txt:htxt,w},subs});
                });
              }else if(learnGroup==='gambits'){
                const subL={e4:'After King\u2019s Pawn (1.e4)',d4:'After Queen\u2019s Pawn (1.d4)',other:'Other first moves'};
                ['e4','d4','other'].forEach(k=>{
                  const idxs=idxsBy(op=>groupOf(op.cat)==='gambits'&&fmKey(op)===k);
                  if(!idxs.length)return;
                  const subs=[['w','\u2654  As White'],['b','\u265A  As Black']].map(([sd,lb])=>({label:lb,idxs:idxs.filter(i=>LIB[i].side===sd)})).filter(s=>s.idxs.length);
                  groups.push({head:{txt:subL[k],ic:'\u2694\uFE0F',accent:true,n:idxs.length},subs});
                });
              }else{
                const cs=cats.filter(c=>groupOf(c)===learnGroup);
                groups=[{head:null,subs:cs.map(cat=>({label:cs.length>1?cat.replace(/^⚔️\s*/,'').replace(/^♚\s*/,''):null,idxs:idxsBy(op=>op.cat===cat)}))}];
              }
              return groups.map((g,gi)=>(
              <div key={gi} style={{marginBottom:14}}>
                {g.head&&(<div style={{margin:'4px 0 9px',padding:'9px 13px',borderRadius:12,display:'flex',alignItems:'center',gap:9,background:g.head.accent?'linear-gradient(135deg,rgba(var(--acr),.30),rgba(var(--acr),.10))':(g.head.w?'linear-gradient(135deg,#f4f6fb,#d9dee8)':'linear-gradient(135deg,#2a2f3a,#14171e)'),border:g.head.accent?'1px solid rgba(var(--acr),.4)':'1px solid transparent',boxShadow:SHADOW_BTN}}>{g.head.ic&&<span style={{fontSize:'clamp(17px,4vw,22px)',lineHeight:1,flexShrink:0}}>{g.head.ic}</span>}<span style={{fontSize:'clamp(15px,3.7vw,19px)',fontWeight:800,letterSpacing:.3,color:g.head.accent?'#fff':(g.head.w?'#1a1d24':'#fff')}}>{g.head.txt}</span>{typeof g.head.n==='number'&&<span style={{marginLeft:'auto',fontSize:'clamp(10px,2.3vw,12px)',fontWeight:800,color:'#fff',background:'rgba(0,0,0,.22)',borderRadius:20,padding:'2px 10px',flexShrink:0}}>{g.head.n}</span>}</div>)}
                {g.subs.map((sub,si)=>(
                <div key={si} style={{marginBottom:9}}>
                  {sub.label&&(<div style={{fontSize:'clamp(9.5px,2.2vw,11.5px)',fontWeight:800,letterSpacing:.4,color:'var(--ac2)',margin:'2px 3px 6px',display:'flex',alignItems:'center',gap:7}}><span style={{width:16,height:3,background:'var(--ac)',borderRadius:2,display:'inline-block',flexShrink:0}}/>{sub.label}</div>)}
                  <div style={{display:'flex',flexDirection:'column',gap:7}}>
                    {sub.idxs.map(i=>{const op=LIB[i];return(
                      <button key={i} onClick={()=>selectOpening(i)} style={{display:'flex',alignItems:'center',gap:11,width:'100%',padding:'11px 12px',borderRadius:11,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',color:'#fff',cursor:'pointer',fontFamily:"'Segoe UI',system-ui,sans-serif",textAlign:'left',boxShadow:SHADOW_BTN}}>
                        <span style={{position:'relative',flexShrink:0}}>
                          <span style={{display:'flex',width:34,height:34,borderRadius:12,alignItems:'center',justifyContent:'center',background:op.side==='w'?'linear-gradient(145deg,#f4f6fb,#cfd6e2)':'linear-gradient(145deg,#3a4150,#1c2029)',border:'1px solid rgba(255,255,255,.18)',fontSize:18,lineHeight:1,color:op.side==='w'?'#1a1d24':'#fff'}}>{op.side==='w'?'♔':'♚'}</span>
                          {trainMastery[op.name]&&trainMastery[op.name].learned&&<span title={Date.now()>(trainMastery[op.name].due||0)?'Review due':'Learned'} style={{position:'absolute',bottom:-3,right:-3,width:15,height:15,borderRadius:'50%',background:Date.now()>(trainMastery[op.name].due||0)?'#e0a83a':'#46b96a',border:'1.5px solid #14171e',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:900,lineHeight:1}}>✓</span>}
                        </span>
                        <span style={{flex:1,minWidth:0}}>
                          <span style={{display:'block',fontSize:'clamp(11.5px,2.7vw,14px)',fontWeight:700}}>{op.name}{(()=>{const lp=learnProg[op.name];if(!lp||!(lp.days||[]).length)return null;const m=(lp.days||[]).length>=LEARN_GOAL;return <span style={{marginLeft:6,fontSize:'clamp(8.5px,2vw,10px)',fontWeight:800,color:m?'#f0c24d':'#6cc78a'}}>{m?'\u2605':'\u2713 '+(lp.days||[]).length+'/'+LEARN_GOAL}</span>;})()}</span>
                          <span style={{display:'block',fontSize:'clamp(8.5px,2vw,10.5px)',color:'rgba(255,255,255,.5)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{op.idea}</span>
                        </span>
                        {groupOf(op.cat)==='gambits'&&(()=>{const m={mate:['#f1a8a0','rgba(236,90,90,.16)','rgba(236,90,90,.5)','♚ Checkmate'],win:['#f0c24d','rgba(240,180,41,.16)','rgba(240,180,41,.5)','♛ Wins queen'],edge:['#a8c4ff','rgba(110,168,254,.14)','rgba(110,168,254,.4)','↗ Better game']}[payoffOf(op)];return(<span style={{flexShrink:0,fontSize:'clamp(8px,1.85vw,9.5px)',fontWeight:800,color:m[0],background:m[1],border:'1px solid '+m[2],borderRadius:20,padding:'3px 8px',lineHeight:1.15,textAlign:'center',maxWidth:84}}>{m[3]}</span>);})()}
                      </button>);})}
                  </div>
                </div>))}
              </div>));
            })()}
          </div>
        )}
        {openIdx!==null&&(<>
          {learnPhase==='demo'&&(<>
            <div style={{alignSelf:'stretch',display:'grid',gridTemplateColumns:'1.8fr 1fr',gap:6}}>
              <button onClick={()=>startPractice(learnLine,learnLabel)} style={btn('var(--ac)','none','#fff')}>✋ Now I'll try it</button>
              <button onClick={()=>setFlip(f=>!f)} style={btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff')}>⟳ Flip</button>
            </div>
            {demoPly>=learnLine.length&&LIB[openIdx].vars&&(
              <div style={{width:'100%',background:'rgba(var(--acr),.12)',border:'1px solid rgba(var(--acr),.3)',borderRadius:12,padding:'9px 11px'}}>
                <div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'var(--ac2)',fontWeight:700,marginBottom:6,textAlign:'center'}}>{learnLabel.includes(' → ')?"♟ See another of White's replies:":"♟ How does White reply? Tap a line to watch it through"}</div>
                <div style={{display:'flex',gap:7,overflowX:'auto',WebkitOverflowScrolling:'touch',padding:'2px 1px 6px'}}>
                  {LIB[openIdx].vars.map((v,vi)=>{const active=learnLabel.endsWith(v.name);const got=lineDays(LIB[openIdx].name+'§'+v.name).length>=1;return(
                    <button key={vi} onClick={()=>pickVariation(v)} style={{flexShrink:0,padding:'8px 13px',borderRadius:18,whiteSpace:'nowrap',border:active?'1.5px solid var(--ac)':'1px solid rgba(255,255,255,.22)',background:active?'rgba(var(--acr),.22)':'rgba(255,255,255,.06)',color:active?'var(--ac2)':'#fff',fontWeight:800,fontSize:'clamp(10px,2.3vw,12px)',cursor:'pointer'}}>{got?'✓ ':''}{v.name}</button>);})}
                </div>
                {(()=>{const _av=LIB[openIdx].vars.find(v=>learnLabel.endsWith(v.name));return _av&&_av.idea?(<div style={{fontSize:'clamp(8.5px,2vw,10.5px)',color:'rgba(255,255,255,.58)',lineHeight:1.4,marginTop:2}}>{_av.idea}</div>):null;})()}
              </div>
            )}
          </>)}
          {learnPhase==='practice'&&(<>
            {openStep>=learnLine.length&&LIB[openIdx].vars&&(
              <div style={{width:'100%',background:'rgba(var(--acr),.12)',border:'1px solid rgba(var(--acr),.3)',borderRadius:12,padding:'9px 11px'}}>
                <div style={{fontSize:'clamp(10px,2.3vw,12px)',color:'var(--ac2)',fontWeight:700,marginBottom:6,textAlign:'center'}}>{learnLabel.includes(' → ')?"♟ See another of White's replies:":"♟ How does White reply? Tap a line to watch it through"}</div>
                <div style={{display:'flex',gap:7,overflowX:'auto',WebkitOverflowScrolling:'touch',padding:'2px 1px 6px'}}>
                  {LIB[openIdx].vars.map((v,vi)=>{const active=learnLabel.endsWith(v.name);const got=lineDays(LIB[openIdx].name+'§'+v.name).length>=1;return(
                    <button key={vi} onClick={()=>pickVariation(v)} style={{flexShrink:0,padding:'8px 13px',borderRadius:18,whiteSpace:'nowrap',border:active?'1.5px solid var(--ac)':'1px solid rgba(255,255,255,.22)',background:active?'rgba(var(--acr),.22)':'rgba(255,255,255,.06)',color:active?'var(--ac2)':'#fff',fontWeight:800,fontSize:'clamp(10px,2.3vw,12px)',cursor:'pointer'}}>{got?'✓ ':''}{v.name}</button>);})}
                </div>
                {(()=>{const _av=LIB[openIdx].vars.find(v=>learnLabel.endsWith(v.name));return _av&&_av.idea?(<div style={{fontSize:'clamp(8.5px,2vw,10.5px)',color:'rgba(255,255,255,.58)',lineHeight:1.4,marginTop:2}}>{_av.idea}</div>):null;})()}
              </div>
            )}
            <div style={{alignSelf:'stretch',display:'flex',flexDirection:'column',gap:8}}>
              <div style={{height:4,borderRadius:2,background:'rgba(255,255,255,.12)',overflow:'hidden'}}><div style={{height:'100%',width:(learnLine.length?Math.round(100*Math.min(openStep,learnLine.length)/learnLine.length):0)+'%',background:'var(--ac)',borderRadius:2,transition:'width .25s'}}/></div>
              {openStep>0&&lpHist.length>1&&(()=>{const n=lpHist.length-1;const cur=lpv==null?n:lpv;const sb=(lbl,fn,dis)=>(<button key={lbl} disabled={dis} onClick={fn} style={{flex:1,minHeight:36,borderRadius:8,background:dis?'rgba(255,255,255,.04)':'rgba(255,255,255,.09)',border:'1px solid rgba(255,255,255,.18)',color:dis?'rgba(255,255,255,.28)':'#fff',fontSize:'clamp(14px,3.4vw,17px)',fontWeight:800,cursor:dis?'default':'pointer'}}>{lbl}</button>);return(<div style={{display:'flex',gap:6,alignItems:'center'}}>{sb('⏮',()=>setLpv(0),cur===0)}{sb('‹',()=>setLpv(Math.max(0,cur-1)),cur===0)}<span style={{flex:'0 0 auto',minWidth:74,textAlign:'center',fontSize:'clamp(9px,2vw,11px)',fontWeight:800,color:lpv==null?'#86d99a':'var(--ac2)',fontFamily:'monospace',letterSpacing:.5}}>{lpv==null?'● LIVE':('Move '+cur+'/'+n)}</span>{sb('›',()=>{const nv=Math.min(n,cur+1);setLpv(nv>=n?null:nv);},cur>=n)}{sb('⏭',()=>setLpv(null),lpv==null)}</div>);})()}
              <div style={{display:'flex',gap:6,alignItems:'stretch'}}>
                <button onClick={()=>setFlip(f=>!f)} aria-label="Flip board" style={{...btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff'),width:46,minWidth:46,padding:'8px 0',fontSize:'clamp(15px,3.4vw,19px)'}}>⟳</button>
                <button onClick={()=>{const nv=!showHint;setShowHint(nv);setHintFor(LIB[openIdx]?.name,nv);if(nv)setRevealHint(false);}} aria-label="Hints" style={{...btn(showHint?'rgba(var(--acr),.2)':'rgba(255,255,255,.08)',showHint?'1px solid var(--ac)':'1px solid rgba(255,255,255,.2)',showHint?'var(--ac2)':'rgba(255,255,255,.6)'),width:46,minWidth:46,padding:'8px 0',fontSize:'clamp(15px,3.4vw,19px)'}}>💡</button>
                <button onClick={()=>startPractice(learnLine,learnLabel)} style={{...btn('#4a6741','none','#fff'),flex:1,fontWeight:800}}>↻ Try again</button>
                <button onClick={()=>setLearnSheet(true)} aria-label="More actions" style={{...btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff'),width:46,minWidth:46,padding:'8px 0',fontSize:'clamp(15px,3.4vw,19px)'}}>⋯</button>
              </div>
              {learnSheet&&(<div onClick={()=>setLearnSheet(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9000,display:'flex',alignItems:'flex-end'}}>
                <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'#1c2027',borderRadius:'16px 16px 0 0',padding:'13px 14px calc(env(safe-area-inset-bottom,0px) + 14px)',display:'flex',flexDirection:'column',gap:8,boxShadow:'0 -8px 30px rgba(0,0,0,.5)'}}>
                  <div style={{width:38,height:4,borderRadius:2,background:'rgba(255,255,255,.25)',margin:'0 auto 4px'}}/>
                  <button onClick={()=>{setLearnSheet(false);setLearnPhase('demo');setDemoPly(0);setDemoPlaying(true);setOpenMsg('');setFlip(LIB[openIdx].side==='b');setGame(LIB[openIdx].fen?fromFEN(LIB[openIdx].fen):initGame());setLastMv(null);UI.current={sel:null,tgts:[],drag:null,dragging:false};repaint();}} style={{...btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','#fff'),width:'100%'}}>▶ Watch the demo again</button>
                  <button onClick={()=>{setLearnSheet(false);const pos=fromFEN(toFEN(boardGame));setMode('play');setOpponent('computer');setPColor(LIB[openIdx].side);setOpenIdx(null);timeCtrlRef.current=null;setTimeCtrl(null);setPlaySetup(false);fullReset(pos);setMenuOpen(false);}} style={{...btn('rgba(var(--acr),.2)','1px solid var(--ac)','var(--ac2)'),width:'100%'}}>▶ Play this position vs Computer</button>
                  <button onClick={()=>setLearnSheet(false)} style={{...btn('transparent','1px solid rgba(255,255,255,.22)','rgba(255,255,255,.7)'),width:'100%'}}>Close</button>
                </div>
              </div>)}
            </div>
          </>)}
          {null}
          {false&&learnPlansBox}
          {!railed&&learnPhase!=='practice'&&learnVideoBox}
        </>)}
      </div>)}

      {/* Move history (play/learn) */}
      {!inReview&&!pzLow&&boardGame.history.length>0&&!(mode==='learn'&&openIdx===null)&&(<div style={{marginTop:10,width:boardPx,maxWidth:'98vw'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:4}}>
          <span style={{fontSize:'clamp(8px,1.8vw,10px)',color:'rgba(255,255,255,.4)',letterSpacing:1.5,fontFamily:'monospace'}}>MOVES</span>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
            <button onClick={analyzeLine} style={{padding:'3px 11px',borderRadius:6,background:'rgba(var(--acr),.18)',border:'1px solid rgba(var(--acr),.4)',color:'var(--ac2)',fontSize:'clamp(9px,2vw,11px)',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>🔍 Analyze</button>
            <button onClick={copyMoves} style={{padding:'3px 11px',borderRadius:6,background:copyMsg?'rgba(var(--acr),.25)':'rgba(255,255,255,.08)',border:`1px solid ${copyMsg?'rgba(var(--acr),.5)':'rgba(255,255,255,.18)'}`,color:copyMsg?'var(--ac2)':'rgba(255,255,255,.72)',fontSize:'clamp(9px,2vw,11px)',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>{copyMsg||'📋 Copy moves'}</button>
          </div>
        </div>
        {mode==='play'&&playHist.length>0&&(()=>{const n=playHist.length;const cur=pvIdx==null?n:pvIdx;const nb=(lbl,on,dis)=>(<button key={lbl} disabled={dis} onClick={on} style={{flex:1,minHeight:30,borderRadius:8,background:dis?'rgba(255,255,255,.04)':'rgba(255,255,255,.09)',border:'1px solid rgba(255,255,255,.18)',color:dis?'rgba(255,255,255,.28)':'#fff',fontSize:'clamp(14px,3.4vw,17px)',fontWeight:800,cursor:dis?'default':'pointer'}}>{lbl}</button>);return(
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
            {nb('⏮',()=>setPvIdx(0),cur===0)}
            {nb('‹',()=>setPvIdx(Math.max(0,cur-1)),cur===0)}
            <span style={{flex:'0 0 auto',minWidth:66,textAlign:'center',fontSize:'clamp(9px,2vw,11px)',fontWeight:800,color:pvIdx==null?'#86d99a':'var(--ac2)',fontFamily:'monospace',letterSpacing:.5}}>{pvIdx==null?'● LIVE':('Move '+cur+'/'+n)}</span>
            {nb('›',()=>{const nv=Math.min(n,cur+1);setPvIdx(nv>=n?null:nv);},cur>=n)}
            {nb('⏭',()=>setPvIdx(null),pvIdx==null)}
          </div>);})()}
        <div className="scroll" style={{maxHeight:80,overflowY:'auto',background:'rgba(0,0,0,.3)',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'6px 11px',WebkitUserSelect:'text',userSelect:'text'}}>
          <div style={{fontSize:'clamp(11px,2.5vw,13.5px)',lineHeight:1.85,fontFamily:'monospace'}}>
            {boardGame.history.map((h,i)=>(<span key={i}>{i%2===0&&<span style={{color:'rgba(255,255,255,.35)',marginRight:2}}>{Math.floor(i/2)+1}.</span>}<span style={{color:i%2===0?'#e0e0e0':'var(--ac2)',marginRight:i%2===1?10:4,fontWeight:i===boardGame.history.length-1?'bold':'normal'}}>{h.san}</span></span>))}
          </div>
        </div>
        <div style={{fontSize:'clamp(8px,1.8vw,10px)',color:'rgba(255,255,255,.42)',marginTop:3,lineHeight:1.4}}>Tap <span style={{color:'var(--ac2)',fontWeight:600}}>🔍 Analyze</span> to review this line move-by-move and play on from any point.</div>
      </div>)}

      {/* Move list (review, clickable + colored) — single horizontal strip */}
      {inReview&&(<div data-mstrip="1" className="scroll" style={{marginTop:10,width:boardPx,maxWidth:'98vw',overflowX:'auto',overflowY:'hidden',whiteSpace:'nowrap',background:'rgba(0,0,0,.3)',border:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:'9px 11px',position:'relative',WebkitOverflowScrolling:'touch'}}>
        <div style={{display:'inline-flex',alignItems:'center',fontSize:'clamp(12px,2.7vw,15px)',fontFamily:'monospace'}}>
          {review.plies.map((p,i)=>{const a=review.analysis[i];const isCur=ply===i+1;const bad=a.cls.label==='Mistake'||a.cls.label==='Blunder'||a.cls.label==='Inaccuracy';return(<span key={i} style={{display:'inline-flex',alignItems:'center'}}>{i%2===0&&<span style={{color:'rgba(255,255,255,.35)',margin:'0 3px 0 7px'}}>{Math.floor(i/2)+1}.</span>}<span ref={isCur?(el=>{if(!el)return;const c=el.closest('[data-mstrip]');if(c){const t=el.offsetLeft-(c.clientWidth-el.offsetWidth)/2;c.scrollTo({left:Math.max(0,t),behavior:'smooth'});}}):undefined} onClick={()=>setPly(i+1)} style={{cursor:'pointer',color:bad?a.cls.c:(i%2===0?'#e0e0e0':'var(--ac2)'),padding:'3px 6px',borderRadius:5,background:isCur?'rgba(255,216,77,.28)':'transparent',fontWeight:isCur?'bold':'normal'}}>{p.san}{bad?a.cls.i:''}</span></span>);})}
        </div>
      </div>)}

        </>);
        const evalW=0;const _evalOn=((inReview||(mode==='play'&&opponent==='computer'))&&!hideEval);
        const _og=onlineGame; const _cap=capturedList(game.board); const _md=materialDiff(game.board);
        const bottomColor=flip?'b':'w'; const topColor=flip?'w':'b';
        const _isOnlineG=opponent==='online'&&!!_og;
        const _avBox=(node)=>(<div style={{width:28,height:28,borderRadius:7,overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,.08)'}}>{node}</div>);
        const _img=(src)=>(<img src={src} alt="" referrerPolicy="no-referrer" style={{width:'100%',height:'100%',objectFit:'cover'}}/>);
        const pBar=(col,isTop)=>{
          const enemy=col==='w'?'b':'w'; let name, av;
          if(_isOnlineG){ const pd=col==='w'?_og.w:_og.b; name=(pd&&pd.name)?pd.name:(col==='w'?'White':'Black'); av=_avBox((pd&&pd.photo)?_img(pd.photo):(<span style={{fontSize:18}}>{col==='w'?'♔':'♚'}</span>)); }
          else if(opponent==='computer'){ if(col===pColor){ name=(cloudUser&&cloudUser.name)?cloudUser.name:'You'; av=_avBox((cloudUser&&cloudUser.photo)?_img(cloudUser.photo):(<span style={{fontSize:18}}>{col==='w'?'♔':'♚'}</span>)); } else { name=botById(selBot)?botById(selBot).name:'Computer'; av=_avBox(<BotFace id={selBot} size={26}/>); } }
          else { name=col==='w'?'White':'Black'; av=_avBox(<span style={{fontSize:18}}>{col==='w'?'♔':'♚'}</span>); }
          const taken=_cap[col]||[]; const lead=col==='w'?(_md>0?_md:0):(_md<0?-_md:0);
          let clk=null, ticking=false;
          if(_isOnlineG&&_og.tc&&_og.tc.kind!=='corr'&&_og.tc.init&&_og.clk){ const base=liveNow-(_og.moveAt||liveNow); const rem=Math.max(0,(_og.clk[col]||0)-(col===game.turn?base:0)); clk=clockFmt(rem); ticking=(col===game.turn)&&_og.status==='active'&&!_og.result; }
          else if(!_isOnlineG&&timeCtrl&&timeCtrl.kind!=='corr'&&clock){ clk=clockFmt(clock[col]); ticking=(col===game.turn)&&!(isOver||playEnd); }
          return(<div style={{width:boardPx,marginLeft:evalW,display:'flex',alignItems:'center',gap:8,padding:'4px 9px',background:'rgba(0,0,0,.34)',borderRadius:isTop?'12px 12px 0 0':'0 0 12px 12px',boxSizing:'border-box',[isTop?'marginBottom':'marginTop']:3}}>{isTop&&_evalOn&&!isOver&&!playEnd&&<span style={{fontFamily:'monospace',fontSize:'clamp(10px,2.4vw,12px)',fontWeight:800,padding:'3px 8px',borderRadius:8,flexShrink:0,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.14)',color:'#fff'}}>{evalTxt}</span>}
            {av}
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:'clamp(12px,3vw,15px)',fontWeight:800,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.15}}>{name}</div>
              <div style={{display:'flex',alignItems:'center',minHeight:18,flexWrap:'wrap'}}>{taken.map((t,i)=>(<span key={i} style={{marginRight:-3,opacity:.95}}><Piece t={t} color={enemy} sz={18} useFallback={fallback} onFail={onPieceFail}/></span>))}{lead>0&&<span style={{fontSize:'clamp(9px,2vw,11px)',fontWeight:800,color:'rgba(255,255,255,.65)',marginLeft:6}}>+{lead}</span>}</div>
            </div>
            {clk!=null&&<div style={{fontFamily:'monospace',fontSize:'clamp(15px,4.2vw,21px)',fontWeight:800,padding:'4px 11px',borderRadius:8,flexShrink:0,background:ticking?'rgba(134,217,154,.18)':'rgba(255,255,255,.06)',border:'1px solid '+(ticking?'rgba(134,217,154,.5)':'rgba(255,255,255,.12)'),color:clk==='0:00'?'#ec9a90':(ticking?'#86d99a':'#fff')}}>{clk}</div>}
          </div>);
        };
        const _showBars=mode==='play'&&!(opponent==='online'&&!_og);
        const _board=(<>
      {showBoard&&(()=>{const lab=Math.max(9,Math.round(SQ*0.26));const cc=(light)=>light?TH.dark:TH.light;return(
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',order:wide?0:(pzLow?2:0),marginTop:pzLow&&!wide?10:0}}>
        {_showBars&&pBar(topColor,true)}
        <div style={{display:'flex',alignItems:'flex-start'}}>
          <div ref={boardRef} onPointerDown={onPtrDown} onPointerMove={onPtrMove} onPointerUp={onPtrUp} onPointerCancel={onPtrCancel}
            style={{display:'grid',gridTemplateColumns:`repeat(8,${SQ}px)`,gridTemplateRows:`repeat(8,${SQ}px)`,width:boardPx,height:boardPx,borderRadius:3,overflow:'hidden',boxShadow:'0 0 0 3px #4a6741, 0 12px 50px rgba(0,0,0,.7)',cursor:dragging?'grabbing':'default',touchAction:'none',position:'relative'}}>
            {dBoard.map((row,rI)=>row.map((piece,cI)=>{
              const isLight=(rI+cI)%2===0;const ar=flip?7-rI:rI,ac=flip?7-cI:cI;const sq=rc2sq(ar,ac);
              const isSel=sel&&sel[0]===ar&&sel[1]===ac;const tgt=tgts.find(m=>m.tr===ar&&m.tc===ac);
              const isLast=boardLast&&((boardLast.fr===ar&&boardLast.fc===ac)||(boardLast.tr===ar&&boardLast.tc===ac));
              const isChk=chkSq===sq;const isHint=hintMove&&((hintMove.fr===ar&&hintMove.fc===ac)||(hintMove.tr===ar&&hintMove.tc===ac));
              const isBest=reviewBest&&((reviewBest.fr===ar&&reviewBest.fc===ac)||(reviewBest.tr===ar&&reviewBest.tc===ac));
              const isDragSrc=drag&&drag.from[0]===ar&&drag.from[1]===ac&&dragging;
              const isPre=mode==='play'&&!_pvLive&&preMv&&((preMv.fr===ar&&preMv.fc===ac)||(preMv.tr===ar&&preMv.tc===ac));const isBox=sqShow&&kpInfo&&kpInfo.cells.has(ar+'-'+ac);
              return(<div key={sq} style={{width:SQ,height:SQ,background:isLight?TH.light:TH.dark,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',boxShadow:boardDepth?'inset 0 0 0 0.5px rgba(0,0,0,.13), inset 0 2px 3px rgba(255,255,255,.13), inset 0 -3px 6px rgba(0,0,0,.2)':'none',touchAction:'none'}}>
                {(isSel||isLast)&&<div style={{position:'absolute',inset:0,background:isSel?HL_SEL:((inReview&&curAnno&&curAnno.cls)?curAnno.cls.c+'4d':HL_LAST),pointerEvents:'none',zIndex:1}}/>}
                {isBox&&<div style={{position:'absolute',inset:0,background:kpInfo.catches?'rgba(110,214,110,.26)':'rgba(255,170,60,.26)',boxShadow:'inset 0 0 0 1px '+(kpInfo.catches?'rgba(110,214,110,.55)':'rgba(255,170,60,.55)'),pointerEvents:'none',zIndex:0}}/>}
                 {isPre&&<div style={{position:'absolute',inset:0,background:HL_PRE,pointerEvents:'none',zIndex:1}}/>}
                {isHint&&<div style={{position:'absolute',inset:0,background:HL_HINT,pointerEvents:'none',zIndex:1}}/>}
                {isBest&&<div style={{position:'absolute',inset:0,background:HL_BEST,pointerEvents:'none',zIndex:1}}/>}
                {isChk&&<div style={{position:'absolute',inset:0,background:status==='checkmate'?'radial-gradient(circle,rgba(229,57,53,.92),rgba(120,10,10,.82))':HL_CHK,boxShadow:status==='checkmate'?'inset 0 0 0 3px #ff5252':'none',pointerEvents:'none',zIndex:1}}/>}
                {tgt&&!piece&&<div style={{position:'absolute',width:SQ*.33,height:SQ*.33,borderRadius:'50%',background:isLight?DOT_L:DOT_D,zIndex:2,pointerEvents:'none'}}/>}
                {tgt&&piece&&<div style={{position:'absolute',inset:0,border:`${SQ*.1}px solid ${CAP_C}`,borderRadius:'50%',zIndex:2,pointerEvents:'none'}}/>}
                {piece&&!(anim&&anim.to[0]===ar&&anim.to[1]===ac)&&<div style={{position:'relative',zIndex:3,transform:'scale(1.06)'}}><Piece t={piece.t} color={piece.c} sz={SQ} ghost={isDragSrc} useFallback={fallback} onFail={onPieceFail}/></div>}
                {cI===0&&<span style={{position:'absolute',top:1,left:2,fontSize:lab,fontWeight:700,color:cc(isLight),zIndex:2,pointerEvents:'none',lineHeight:1}}>{rankLabels[rI]}</span>}
                {rI===7&&<span style={{position:'absolute',bottom:1,right:3,fontSize:lab,fontWeight:700,color:cc(isLight),zIndex:2,pointerEvents:'none',lineHeight:1}}>{fileLabels[cI]}</span>}
              </div>);
            }))}
            <Arrows arrows={reviewBest?[...boardArrows,{from:[reviewBest.fr,reviewBest.fc],to:[reviewBest.tr,reviewBest.tc],color:'#5bd16a'}]:boardArrows} SQ={SQ} flip={flip} boardPx={boardPx}/>
            {anim&&anim.piece&&(()=>{const sCol=flip?7-anim.from[1]:anim.from[1],sRow=flip?7-anim.from[0]:anim.from[0],dCol=flip?7-anim.to[1]:anim.to[1],dRow=flip?7-anim.to[0]:anim.to[0];const x=(animTo?dCol:sCol)*SQ,y=(animTo?dRow:sRow)*SQ;return(<div style={{position:'absolute',top:0,left:0,width:SQ,height:SQ,transform:`translate(${x}px,${y}px)`,transition:animTo?'transform .42s ease-in-out':'none',zIndex:5,pointerEvents:'none'}}><span style={{display:'block',transform:'scale(1.06)'}}><Piece t={anim.piece.t} color={anim.piece.c} sz={SQ} useFallback={fallback} onFail={onPieceFail}/></span></div>);})()}{inReview&&curAnno&&curAnno.cls&&boardLast&&(()=>{const B=curAnno.cls;const dCol=flip?7-boardLast.tc:boardLast.tc,dRow=flip?7-boardLast.tr:boardLast.tr;const x=dCol*SQ,y=dRow*SQ;const bs=Math.round(SQ*0.46);const big=B.label==='Brilliant';const emph=big||B.label==='Blunder';const showLabel=emph;return(<div key={'rvov'+ply} style={{position:'absolute',top:0,left:0,width:boardPx,height:boardPx,zIndex:7,pointerEvents:'none'}}>{big&&<div style={{position:'absolute',left:x+SQ/2-SQ/2,top:y+SQ/2-SQ/2,width:SQ,height:SQ,borderRadius:'50%',border:'3px solid '+B.c,animation:'brilburst .6s ease-out both'}}/>}{showLabel&&<div style={{position:'absolute',left:x+SQ/2,top:y-Math.round(SQ*0.32),transform:'translateX(-50%)',background:B.c,color:'#fff',fontWeight:900,fontSize:Math.max(9,Math.round(SQ*0.2)),padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap',boxShadow:'0 2px 7px rgba(0,0,0,.5)',textShadow:'0 1px 2px rgba(0,0,0,.45)',animation:'iconpop .4s cubic-bezier(.34,1.56,.64,1) both'}}>{B.label}</div>}<div style={{position:'absolute',left:x+SQ-bs*0.62,top:y-bs*0.38,width:bs,height:bs,borderRadius:'50%',background:B.c,border:'2.5px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:big?('0 0 10px 3px '+B.c):'0 2px 5px rgba(0,0,0,.55)',animation:emph?'iconpop .4s cubic-bezier(.34,1.56,.64,1) both':'none'}}><span style={{fontSize:Math.round(bs*(B.i.length>1?0.46:0.6)),fontWeight:900,color:'#fff',lineHeight:1,letterSpacing:B.i.length>1?-0.5:0}}>{B.i}</span></div></div>);})()}{inReview&&review&&ply===review.plies.length&&review.plies.length>0&&review.headers&&review.headers.Result&&review.headers.Result!=='*'&&(()=>{const R=review.headers.Result;const isDraw=R==='1/2-1/2';const wWon=R==='1-0';const lastSan=(review.plies[review.plies.length-1].san)||'';const isMate=/#/.test(lastSan);const head=isDraw?'Draw':(wWon?'White won':'Black won');const sub=isDraw?'½–½':(isMate?'by checkmate':'game over');const bg=wWon?'linear-gradient(160deg,#fff,#dde2e9)':isDraw?'rgba(12,14,20,.94)':'linear-gradient(160deg,#1b1f2a,#0a0c12)';const bd=wWon?'#c6ccd6':'#ffd84d';const hc=wWon?'#161922':'#fff';const sc2=wWon?'#3a4150':'rgba(255,255,255,.86)';return(<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',zIndex:9}}><div style={{background:bg,border:'2px solid '+bd,borderRadius:14,padding:'10px 20px',textAlign:'center',boxShadow:'0 12px 44px rgba(0,0,0,.7)'}}><div style={{fontSize:'clamp(17px,4.6vw,28px)',fontWeight:800,color:hc,lineHeight:1.05}}>{head}</div><div style={{fontSize:'clamp(10px,2.5vw,14px)',fontWeight:800,color:sc2,marginTop:3}}>{sub}</div></div></div>);})()}
            {opponent!=='online'&&gameResult&&(()=>{const ww=_winSide==='w',bw=_winSide==='b';const bg=ww?'linear-gradient(160deg,#ffffff,#dde2e9)':bw?'linear-gradient(160deg,#1b1f2a,#0a0c12)':'rgba(10,12,18,.9)';const bd=ww?'#c6ccd6':bw?'#ffd84d':'rgba(255,255,255,.55)';const hc=ww?'#161922':'#fff';const sc=ww?'#3a4150':bw?'#ffd84d':'rgba(255,255,255,.85)';return(<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',zIndex:8}}><div style={{background:bg,border:'2px solid '+bd,borderRadius:16,padding:'12px 20px',textAlign:'center',boxShadow:'0 12px 48px rgba(0,0,0,.7)',maxWidth:'86%'}}><div style={{fontSize:'clamp(20px,5.2vw,40px)',fontWeight:800,color:hc,letterSpacing:.5,lineHeight:1.05}}>{gameResult.head}</div><div style={{fontSize:'clamp(11px,2.8vw,18px)',fontWeight:800,color:sc,marginTop:4}}>{gameResult.sub}</div></div></div>);})()}
            {opponent==='online'&&onlineGame&&(()=>{const og=onlineGame;const mn=(og.notice&&og.notice.for===myColor)?og.notice:null;const incDraw=(og.drawBy&&og.drawBy!==myColor&&!og.result);if(!mn||og.result||incDraw)return null;return(<div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'center',padding:8,zIndex:10,pointerEvents:'auto'}}><div onClick={onlineDismissNotice} style={{background:'rgba(236,154,144,.96)',borderRadius:11,padding:'9px 14px',boxShadow:'0 8px 24px rgba(0,0,0,.5)',fontSize:'clamp(12px,2.8vw,14.5px)',fontWeight:800,color:'#2a1410',cursor:'pointer'}}>{mn.msg}　✕</div></div>);})()}
            {opponent==='online'&&onlineGame&&(()=>{const og=onlineGame;const dB=og.drawBy||null;const rB=og.rematchBy||null;
              const oppName=(myColor==='w'?(og.b&&og.b.name):(og.w&&og.w.name))||'Opponent';
              const incomingDraw=dB&&dB!==myColor&&!og.result;
              if(!og.result&&!incomingDraw)return null;
              const oBtn={...btn('var(--ac)','none','#1a1a1a'),fontWeight:800};const gBtn=btn('rgba(255,255,255,.12)','1px solid rgba(255,255,255,.28)','#fff');
              if(!og.result){
                return(<div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'center',padding:8,zIndex:9,pointerEvents:'auto'}}>
                  <div style={{background:'rgba(10,12,18,.95)',border:'1px solid rgba(110,168,254,.5)',borderRadius:12,padding:'10px 14px',boxShadow:'0 8px 28px rgba(0,0,0,.6)',display:'flex',flexDirection:'column',gap:8,alignItems:'center',maxWidth:'94%'}}>
                    <div style={{fontSize:'clamp(12px,2.8vw,15px)',fontWeight:800,color:'#cfe0ff'}}>🤝 {oppName} offers a draw</div>
                    <div style={{display:'flex',gap:8}}><button onClick={onlineDeclineDraw} style={gBtn}>Decline</button><button onClick={onlineAcceptDraw} style={oBtn}>Accept ½–½</button></div>
                  </div></div>);
              }
              const meWon=(og.result==='1-0'&&myColor==='w')||(og.result==='0-1'&&myColor==='b');const isDraw=og.result==='1/2-1/2';
              const head=isDraw?'Draw agreed':(meWon?'You won!':'You lost');
              const sub=isDraw?'½–½':(og.endBy==='resign'?(og.resignedBy===myColor?'You resigned':oppName+' resigned'):(og.endBy==='mate'?'by checkmate':(og.endBy==='time'?'on time':'')));
              let actions;
              if(rB&&rB!==myColor)actions=(<><button onClick={onlineDeclineRematch} style={gBtn}>Decline</button><button onClick={onlineAcceptRematch} style={oBtn}>Accept rematch</button></>);
              else if(rB===myColor)actions=(<><button disabled style={{...gBtn,opacity:.6,cursor:'default'}}>Rematch offered…</button><button onClick={onlineCancelRematch} style={gBtn}>Cancel</button></>);
              else actions=(<><button onClick={onlineOfferRematch} style={oBtn}>🔄 Rematch</button><button onClick={onlineLeave} style={gBtn}>← Leave</button></>);
              return(<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:9,pointerEvents:'auto'}}><div style={{background:'rgba(10,12,18,.93)',border:'2px solid rgba(var(--acr),.6)',borderRadius:16,padding:'18px 22px',textAlign:'center',boxShadow:'0 12px 48px rgba(0,0,0,.7)',maxWidth:'90%'}}>
                <div style={{fontSize:'clamp(20px,5.2vw,38px)',fontWeight:800,color:'#fff',letterSpacing:.5,lineHeight:1.05}}>{head}</div>
                {sub&&<div style={{fontSize:'clamp(11px,2.8vw,16px)',fontWeight:700,color:'rgba(255,255,255,.82)',marginTop:4}}>{sub}</div>}
                <div style={{marginTop:14,display:'flex',gap:9,justifyContent:'center',flexWrap:'wrap'}}>{actions}</div>
              </div></div>);})()}
          </div>
        </div>
        {_showBars&&pBar(bottomColor,false)}
      </div>);})()}
        </>);
        return railed ? (
          <div style={outerRowStyle}>
            {_board}
            <div className="ctside" style={sideColStyle}>{_blurbs}{_controls}</div>
          </div>
        ) : (mode==='learn'&&openIdx!==null) ? (
          <div style={{flex:1,alignSelf:'stretch',width:'100%',minHeight:0,display:'flex',flexDirection:'column',alignItems:'center'}}>
            {_blurbs}
            {learnPhase==='practice'&&(<div style={{width:boardPx,maxWidth:'98vw',display:'flex',flexDirection:'column',gap:9,marginTop:6}}>{(()=>{const grp=groupOf(LIB[openIdx].cat);const noun=grp==='endgames'?'endgames':grp==='gambits'?'gambits':'openings';return(<button onClick={()=>setOpenIdx(null)} style={{...btn('rgba(255,255,255,.08)','1px solid rgba(255,255,255,.2)','rgba(255,255,255,.85)'),width:'100%',fontSize:'clamp(11px,2.5vw,13px)'}}>‹ All {noun}</button>);})()}</div>)}
            <div style={{flex:1,minHeight:10}}/>
            {_board}
            {_controls}
          </div>
        ) : (<>{_blurbs}{_board}{_controls}</>);
      })()}

      {drag&&dragging&&(<div style={{position:'fixed',left:drag.x-SQ*.55,top:drag.y-SQ*.55,width:SQ*1.1,height:SQ*1.1,pointerEvents:'none',zIndex:9999,filter:'drop-shadow(0 8px 16px rgba(0,0,0,.6))',transform:'scale(1.12)'}}><Piece t={drag.piece.t} color={drag.piece.c} sz={SQ*1.1} useFallback={fallback} onFail={onPieceFail}/></div>)}
    </div>
  );
}
