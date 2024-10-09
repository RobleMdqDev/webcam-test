"use client";

import React, {useRef, useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {Input} from "./ui/input";

export default function WebCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(
    "http://localhost:5000/test"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error("Error accessing the camera:", error);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        const imageDataUrl = canvasRef.current.toDataURL("image/jpeg");
        setCapturedImage(imageDataUrl);
      }
    }
  };

  const sendImage = async () => {
    if (capturedImage && endpoint) {
      setIsLoading(true);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({image: capturedImage}),
        });
        const data = await response.json();
        setResult(data.message || "Comparación completada");
      } catch (error) {
        console.error("Error sending image:", error);
        setResult("Error al enviar la imagen");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Captura de Cámara Web</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label htmlFor="endpointInput">Ingresar endpoint</label>
        <Input
          id="endpointInput"
          type="text"
          value={endpoint || ""}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="Ingresar endpoint"
        />
        <div className="relative aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-md"
          />
        </div>
        <canvas ref={canvasRef} width={640} height={480} className="hidden" />
        {capturedImage && (
          <div className="mt-4">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full rounded-md"
            />
          </div>
        )}
        {result && (
          <div className="mt-4 p-2 bg-gray-100 rounded-md">
            <p>{result}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={captureImage}>Capturar Imagen</Button>
        <Button onClick={sendImage} disabled={!capturedImage || isLoading}>
          {isLoading ? "Enviando..." : "Enviar para Comparar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
