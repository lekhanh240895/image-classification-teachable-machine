"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as tmImage from "@teachablemachine/image";

let model: tmImage.CustomMobileNet | null,
  maxPredictions: number,
  webcam: tmImage.Webcam | null;

function ImageClassification() {
  const URL = "https://teachablemachine.withgoogle.com/models/imWRuzxjk/";
  const webcamContainerRef = useRef<HTMLDivElement>(null);
  const [cameraOptions, setCameraOptions] = useState<string[]>([]);
  const [camera, setCamera] = useState("Front");
  const [predictions, setPredictions] = useState<
    {
      className: string;
      probability: number;
    }[]
  >([]);
  const [isAllow, setIsAllow] = useState(false);

  const isIos = useMemo(() => {
    if (
      typeof window !== "undefined" &&
      (window.navigator.userAgent.indexOf("iPhone") > -1 ||
        window.navigator.userAgent.indexOf("iPad") > -1)
    ) {
      return true;
    }
    return false;
  }, []);

  const getCameraSelection = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(
      (device) => device.kind === "videoinput"
    );
    const options = videoDevices.map((videoDevice) => videoDevice.label);
    setCameraOptions(options);
  }, []);

  useEffect(() => {
    if (isAllow) {
      getCameraSelection();
    }
  }, [getCameraSelection, isAllow]);

  useEffect(() => {
    window.addEventListener("resize", () => {});
  }, []);

  const init = async () => {
    stop();

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Instantiate the webcam with the calculated width and height
    webcam = new tmImage.Webcam();
    // webcam = new tmImage.Webcam(webcamWidth, webcamHeight, flip);

    await webcam.setup({
      facingMode: camera
        ? camera.includes("Front")
          ? "user"
          : "environment"
        : "environment",
    }); // request access to the webcam

    setIsAllow(true);

    // Append elements to the DOM
    if (webcamContainerRef.current) {
      if (isIos) {
        const existingVideo = webcamContainerRef.current.querySelector("video");
        if (existingVideo) {
          webcamContainerRef.current.removeChild(existingVideo);
        }
        webcamContainerRef.current.appendChild(webcam.webcam);
        const webCamVideo = document.getElementsByTagName("video")[0];
        webCamVideo.setAttribute("playsinline", "true"); // written with "setAttribute" bc. iOS buggs otherwise
        webCamVideo.muted = true;
        webCamVideo.style.width = "calc(100% - 48px)";
        webCamVideo.style.height = "100%";
        webCamVideo.style.objectFit = "contain";
        webCamVideo.style.borderRadius = "10px";
      } else {
        // Remove any existing canvas
        const existingCanvas =
          webcamContainerRef.current.querySelector("canvas");
        if (existingCanvas) {
          webcamContainerRef.current.removeChild(existingCanvas);
        }
        // Append the new canvas
        webcam.canvas.style.width = "calc(100% - 48px)";
        webcam.canvas.style.height = "100%";
        webcam.canvas.style.objectFit = "contain";
        webcam.canvas.style.borderRadius = "10px";
        webcamContainerRef.current.appendChild(webcam.canvas);
      }
    }

    if (webcam) {
      webcam.play();
      window.requestAnimationFrame(loop);
    }
  };

  function stop() {
    if (webcam) {
      webcam.stop();
      webcam = null;
    }
  }

  async function loop() {
    if (webcam) {
      webcam.update(); // update the webcam frame
      await predict();
      window.requestAnimationFrame(loop);
    }
  }

  // run the webcam image through the image model
  async function predict() {
    // predict can take in an image, video or canvas html element
    let predictions;
    const flip = true;

    if (webcam && model) {
      if (isIos) {
        predictions = await model.predict(webcam.webcam, flip);
      } else {
        predictions = await model.predict(webcam.canvas, flip);
      }

      setPredictions(predictions);
    }
  }

  return (
    <div className="min-h-screen p-6 flex flex-col items-center gap-4 max-w-screen-sm mx-auto">
      <h1 className="font-bold text-2xl">Teachable Machine Image</h1>
      {isAllow && (
        <select
          onChange={(e) => setCamera(e.target.value)}
          value={camera}
          className="rounded p-2 w-full text-center"
        >
          {cameraOptions.map((o) => (
            <option value={o} key={o}>
              {o}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-2 w-full">
        <button
          className="p-2 bg-blue-500 flex-1 rounded text-white"
          type="button"
          onClick={init}
        >
          Start
        </button>
        <button
          className="p-2 bg-blue-500 flex-1 rounded text-white"
          type="button"
          onClick={stop}
        >
          Stop
        </button>
      </div>

      <div
        id="webcam-container"
        ref={webcamContainerRef}
        className="w-screen scale-x-[-1] flex justify-center rounded max-w-screen-sm md:h-[500px]"
      ></div>

      {webcam &&
        predictions
          .filter((p) => p.probability > 0.8)
          .map((p) => (
            <div key={p.className} className="font-medium text-center">
              <h2>
                Dự đoán: {p.className} - {(p.probability * 100).toFixed(2)}%
              </h2>
            </div>
          ))}
    </div>
  );
}

export default ImageClassification;
