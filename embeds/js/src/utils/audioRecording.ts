/**
 * @fileoverview This file contains the API to handle audio recording.
 * Originally from 'https://ralzohairi.medium.com/audio-recording-in-javascript-96eed45b75ee'
 */

// audio-recording.js ---------------
let elapsedTime = '00:00';

/** Stores the actual start time when an audio recording begins to take place to ensure elapsed time start time is accurate*/
let audioRecordStartTime: Date;

/** Stores the maximum recording time in hours to stop recording once maximum recording hour has been reached */
const maximumRecordingTimeInHours = 1;

/** Stores the reference of the setInterval function that controls the timer in audio recording*/
let elapsedTimeTimer: ReturnType<typeof setInterval>;

export function getElaspedTime() {
  return elapsedTime;
}

/** Starts the audio recording*/
export function startAudioRecording(
  onRecordingStart: (value: boolean) => void,
  onUnsupportedBrowser: (value: boolean) => void,
  setElapsedTime: (value: string) => void,
) {
  //start recording using the audio recording API
  audioRecorder
    .start()
    .then(() => {
      //on success show the controls to stop and cancel the recording
      if (onRecordingStart) {
        onRecordingStart(true);
      }
      //store the recording start time to display the elapsed time according to it
      audioRecordStartTime = new Date();

      //Handle the displaying of the elapsed recording time
      handleElapsedRecordingTime(setElapsedTime);
    })
    .catch((error) => {
      //on error
      //No Browser Support Error
      if (error.message.includes('mediaDevices API or getUserMedia method is not supported in this browser.')) {
        if (onUnsupportedBrowser) {
          onUnsupportedBrowser(true);
        }
      }

      console.log(error);

      //Error handling structure
      switch (error.name) {
        case 'AbortError': //error from navigator.mediaDevices.getUserMedia
          // eslint-disable-next-line no-console
          console.log('An AbortError has occurred.');
          break;
        case 'NotAllowedError': //error from navigator.mediaDevices.getUserMedia
          // eslint-disable-next-line no-console
          console.log('A NotAllowedError has occurred. User might have denied permission.');
          break;
        case 'NotFoundError': //error from navigator.mediaDevices.getUserMedia
          // eslint-disable-next-line no-console
          console.log('A NotFoundError has occurred.');
          break;
        case 'NotReadableError': //error from navigator.mediaDevices.getUserMedia
          // eslint-disable-next-line no-console
          console.log('A NotReadableError has occurred.');
          break;
        case 'SecurityError': //error from navigator.mediaDevices.getUserMedia or from the MediaRecorder.start
          // eslint-disable-next-line no-console
          console.log('A SecurityError has occurred.');
          break;
        case 'TypeError': //error from navigator.mediaDevices.getUserMedia
          // eslint-disable-next-line no-console
          console.log('A TypeError has occurred.');
          break;
        case 'InvalidStateError': //error from the MediaRecorder.start
          // eslint-disable-next-line no-console
          console.log('An InvalidStateError has occurred.');
          break;
        case 'UnknownError': //error from the MediaRecorder.start
          // eslint-disable-next-line no-console
          console.log('An UnknownError has occurred.');
          break;
        default:
          // eslint-disable-next-line no-console
          console.log('An error occurred with the error name ' + error.name);
      }
    });
}
/** Stop the currently started audio recording & sends it
 */
export function stopAudioRecording(addRecordingToPreviews: null | ((blob: Blob) => void)) {
  //stop the recording using the audio recording API
  audioRecorder
    .stop()
    .then((audioBlob) => {
      //stop interval that handles both time elapsed and the red dot
      clearInterval(elapsedTimeTimer);
      if (addRecordingToPreviews) {
        addRecordingToPreviews(audioBlob as Blob);
      }
    })
    .catch((error) => {
      //Error handling structure
      switch (error.name) {
        case 'InvalidStateError': //error from the MediaRecorder.stop
          // eslint-disable-next-line no-console
          console.log('An InvalidStateError has occurred.');
          break;
        default:
          // eslint-disable-next-line no-console
          console.log('An error occurred with the error name ' + error.name);
      }
    });
}

/** Cancel the currently started audio recording */
export function cancelAudioRecording() {
  //cancel the recording using the audio recording API
  audioRecorder.cancel();

  //stop interval that handles both time elapsed and the red dot
  clearInterval(elapsedTimeTimer);
}

/** Computes the elapsed recording time since the moment the function is called in the format h:m:s*/
function handleElapsedRecordingTime(setElapsedTime: (value: string) => void) {
  //display initial time when recording begins
  elapsedTime = '00:00';
  // set elapsed time so it can be displayed in the component
  setElapsedTime(elapsedTime);

  //create an interval that compute & displays elapsed time, as well as, animate red dot - every second
  elapsedTimeTimer = setInterval(() => {
    //compute the elapsed time every second
    elapsedTime = computeElapsedTime(audioRecordStartTime); //pass the actual record start time
    // set elapsed time so it can be displayed in the component
    setElapsedTime(elapsedTime);
    //display the elapsed time
    displayElapsedTimeDuringAudioRecording();
  }, 1000); //every second
}

/** Display elapsed time during audio recording
 */
function displayElapsedTimeDuringAudioRecording() {
  // Stop the recording when the max number of hours is reached
  if (elapsedTimeReachedMaximumNumberOfHours()) {
    stopAudioRecording(null);
  }
}

/**
 * @returns {Boolean} whether the elapsed time reached the maximum number of hours or not
 */
function elapsedTimeReachedMaximumNumberOfHours() {
  //Split the elapsed time by the symbol that separates the hours, minutes and seconds :
  const elapsedTimeSplit = elapsedTime.split(':');

  //Turn the maximum recording time in hours to a string and pad it with zero if less than 10
  const maximumRecordingTimeInHoursAsString =
    maximumRecordingTimeInHours < 10 ? '0' + maximumRecordingTimeInHours : maximumRecordingTimeInHours.toString();

  //if the elapsed time reach hours and also reach the maximum recording time in hours return true
  return elapsedTimeSplit.length === 3 && elapsedTimeSplit[0] === maximumRecordingTimeInHoursAsString;
}

function padLeft(num: number, size: number) {
  return `${num}`.padStart(size, '0');
}

/** Computes the elapsedTime since the moment the function is called in the format mm:ss or hh:mm:ss
 * @param {String} startTime - start time to compute the elapsed time since
 * @returns {String} elapsed time in mm:ss format or hh:mm:ss format, if elapsed hours are 0.
 */
function computeElapsedTime(startTime: Date) {
  //record end time
  const endTime = new Date();

  //time difference in ms
  let timeDiff = endTime.getTime() - startTime.getTime();

  //convert time difference from ms to seconds
  timeDiff = timeDiff / 1000;

  //extract integer seconds that don't form a minute using %
  const seconds = Math.floor(timeDiff % 60); //ignoring incomplete seconds (floor)

  //convert time difference from seconds to minutes using %
  timeDiff = Math.floor(timeDiff / 60);

  //extract integer minutes that don't form an hour using %
  const minutes = timeDiff % 60; //no need to floor possible incomplete minutes, because they've been handled as seconds

  //convert time difference from minutes to hours
  timeDiff = Math.floor(timeDiff / 60);

  //extract integer hours that don't form a day using %
  const hours = timeDiff % 24; //no need to floor possible incomplete hours, because they've been handled as seconds

  //convert time difference from hours to days
  timeDiff = Math.floor(timeDiff / 24);

  // the rest of timeDiff is number of days
  const days = timeDiff; //add days to hours

  const totalHours = hours + days * 24;

  if (totalHours === 0) {
    return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
  } else {
    return padLeft(totalHours, 2) + ':' + padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
  }
}

//API to handle audio recording

type AudioRecorder = {
  audioBlobs: Blob[];
  mediaRecorder: MediaRecorder | null;
  streamBeingCaptured: MediaStream | null;
  start: () => Promise<void>;
  stop: () => Promise<unknown>;
  cancel: () => void;
  stopStream: () => void;
  resetRecordingProperties: () => void;
};

export const audioRecorder: AudioRecorder = {
  /** Stores the recorded audio as Blob objects of audio data as the recording continues*/
  audioBlobs: [] /*of type Blob[]*/,
  /** Stores the reference of the MediaRecorder instance that handles the MediaStream when recording starts*/
  mediaRecorder: null /*of type MediaRecorder*/,
  /** Stores the reference to the stream currently capturing the audio*/
  streamBeingCaptured: null /*of type MediaStream*/,
  /** Start recording the audio
   * @returns {Promise} - returns a promise that resolves if audio recording successfully started
   */
  start: function () {
    //Feature Detection
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      //Feature is not supported in browser
      //return a custom error
      return Promise.reject(new Error('mediaDevices API or getUserMedia method is not supported in this browser.'));
    } else {
      //Feature is supported in browser

      //create an audio stream
      return (
        navigator.mediaDevices
          .getUserMedia({ audio: true } /*of type MediaStreamConstraints*/)
          //returns a promise that resolves to the audio stream
          .then((stream) /*of type MediaStream*/ => {
            //save the reference of the stream to be able to stop it when necessary
            audioRecorder.streamBeingCaptured = stream;

            //create a media recorder instance by passing that stream into the MediaRecorder constructor
            audioRecorder.mediaRecorder = new MediaRecorder(stream);
            /*the MediaRecorder interface of the MediaStream Recording API provides functionality to easily record media*/

            //clear previously saved audio Blobs, if any
            audioRecorder.audioBlobs = [];

            //add a dataavailable event listener in order to store the audio data Blobs when recording
            audioRecorder.mediaRecorder.addEventListener('dataavailable', (event) => {
              //store audio Blob object
              audioRecorder.audioBlobs.push(event.data);
            });

            //start the recording by calling the start method on the media recorder
            audioRecorder.mediaRecorder.start();
          })
      );

      /* errors are not handled in the API because if its handled and the promise is chained, the .then after the catch will be executed*/
    }
  },
  /** Stop the started audio recording
   * @returns {Promise} - returns a promise that resolves to the audio as a blob file
   */
  stop: function () {
    //return a promise that would return the blob or URL of the recording
    return new Promise((resolve) => {
      //save audio type to pass to set the Blob type
      const mimeType = audioRecorder.mediaRecorder?.mimeType;

      //listen to the stop event in order to create & return a single Blob object
      audioRecorder.mediaRecorder?.addEventListener('stop', () => {
        //create a single blob object, as we might have gathered a few Blob objects that needs to be joined as one
        const audioBlob = new Blob(audioRecorder.audioBlobs, { type: mimeType });

        //resolve promise with the single audio blob representing the recorded audio
        resolve(audioBlob);
      });
      audioRecorder.cancel();
    });
  },
  /** Cancel audio recording*/
  cancel: function () {
    //stop the recording feature
    audioRecorder.mediaRecorder?.stop();

    //stop all the tracks on the active stream in order to stop the stream
    audioRecorder.stopStream();

    //reset API properties for next recording
    audioRecorder.resetRecordingProperties();
  },
  /** Stop all the tracks on the active stream in order to stop the stream and remove
   * the red flashing dot showing in the tab
   */
  stopStream: function () {
    //stopping the capturing request by stopping all the tracks on the active stream
    audioRecorder.streamBeingCaptured
      ?.getTracks() //get all tracks from the stream
      .forEach((track) /*of type MediaStreamTrack*/ => track.stop()); //stop each one
  },
  /** Reset all the recording properties including the media recorder and stream being captured*/
  resetRecordingProperties: function () {
    audioRecorder.mediaRecorder = null;
    audioRecorder.streamBeingCaptured = null;

    /*No need to remove event listeners attached to mediaRecorder as
    If a DOM element which is removed is reference-free (no references pointing to it), the element itself is picked
    up by the garbage collector as well as any event handlers/listeners associated with it.
    getEventListeners(audioRecorder.mediaRecorder) will return an empty array of events.*/
  },
};
