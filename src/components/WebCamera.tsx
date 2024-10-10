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
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Slider} from "@/components/ui/slider";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Textarea} from "@/components/ui/textarea";
import {X} from "lucide-react";

export default function WebcamCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [endpointUrl, setEndpointUrl] = useState(
    "http://localhost:5000/verify-face-base64"
  );
  const [imageFormat, setImageFormat] = useState("image/jpeg");
  const [imageWidth, setImageWidth] = useState(640);
  const [imageHeight, setImageHeight] = useState(480);
  const [aspectRatio, setAspectRatio] = useState(4 / 3);
  const [imageQuality, setImageQuality] = useState(0.92);
  const [imageSize, setImageSize] = useState<number | null>(null);
  const [sendMethod, setSendMethod] = useState("base64");
  const [imageKeyName, setImageKeyName] = useState("image");

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: {ideal: imageWidth},
            height: {ideal: imageHeight},
            aspectRatio: {ideal: aspectRatio},
          },
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
  }, [imageWidth, imageHeight, aspectRatio]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        const imageDataUrl = canvasRef.current.toDataURL(
          imageFormat,
          imageQuality
        );
        setCapturedImage(imageDataUrl);

        const base64 = imageDataUrl.split(",")[1];
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        setImageSize(bytes.length);
      }
    }
  };

  const closeCapture = () => {
    setCapturedImage(null);
    setImageSize(null);
  };

  const getRequestBody = () => {
    if (sendMethod === "base64") {
      return {
        [imageKeyName]: capturedImage,
        width: imageWidth,
        height: imageHeight,
        format: imageFormat,
        quality: imageQuality,
      };
    } else if (sendMethod === "blob") {
      if (capturedImage) {
        const base64Data = capturedImage.split(",")[1]; // Remover el prefijo 'data:image/jpeg;base64,'
        const byteString = atob(base64Data);
        const arrayBuffer = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          arrayBuffer[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([arrayBuffer], {type: imageFormat}); // Convertir base64 a Blob

        const formData = new FormData();
        formData.append(
          imageKeyName,
          blob,
          "image." + imageFormat.split("/")[1]
        ); // Agregar el Blob en lugar del string
        formData.append("width", imageWidth.toString());
        formData.append("height", imageHeight.toString());
        formData.append("format", imageFormat);
        formData.append("quality", imageQuality.toString());

        return formData;
      } else {
        throw new Error("No image captured to send as blob");
      }
    }
    return {};
  };

  const sendImage = async () => {
    if (capturedImage) {
      setIsLoading(true);
      try {
        let body;
        if (sendMethod === "base64") {
          body = JSON.stringify(getRequestBody());
        } else if (sendMethod === "blob") {
          // Aseguro que capturedImage no sea null antes de continuar
          if (capturedImage) {
            const response = await fetch(capturedImage);
            const blob = await response.blob();
            const formData = new FormData();
            formData.append(
              imageKeyName,
              blob,
              "image." + imageFormat.split("/")[1]
            );
            formData.append("width", imageWidth.toString());
            formData.append("height", imageHeight.toString());
            formData.append("format", imageFormat);
            formData.append("quality", imageQuality.toString());
            body = formData;
          }
        }

        const response = await fetch(endpointUrl, {
          method: "POST",
          headers:
            sendMethod === "base64"
              ? {
                  "Content-Type": "application/json",
                }
              : undefined,
          body: body,
        });

        const data = await response.json();
        setResult(data.message || "Comparación completada");
      } catch (error) {
        console.error("Error sending image:", error);
        setResult(
          "Error al enviar la imagen: " +
            (error instanceof Error ? error.message : String(error))
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleWidthChange = (newWidth: number) => {
    setImageWidth(newWidth);
    setImageHeight(Math.round(newWidth / aspectRatio));
  };

  const handleHeightChange = (newHeight: number) => {
    setImageHeight(newHeight);
    setImageWidth(Math.round(newHeight * aspectRatio));
  };

  const handleAspectRatioChange = (newRatio: string) => {
    const [width, height] = newRatio.split(":").map(Number);
    const newAspectRatio = width / height;
    setAspectRatio(newAspectRatio);
    setImageHeight(Math.round(imageWidth / newAspectRatio));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full max-w-7xl mx-auto p-4">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Captura y Edición de Imagen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto object-cover rounded-md"
            />
            {capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="max-w-full max-h-full object-contain"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={closeCapture}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Cerrar captura</span>
                </Button>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          {capturedImage && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <h3 className="font-semibold mb-2">Detalles de la imagen:</h3>
              <p>
                Dimensiones: {imageWidth} x {imageHeight} px
              </p>
              <p>Formato: {imageFormat.split("/")[1].toUpperCase()}</p>
              <p>Calidad: {Math.round(imageQuality * 100)}%</p>
              <p>
                Tamaño:{" "}
                {imageSize
                  ? `${(imageSize / 1024).toFixed(2)} KB`
                  : "Calculando..."}
              </p>
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

      <Card className="lg:w-80">
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="dimensions">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dimensions">Dimensiones</TabsTrigger>
              <TabsTrigger value="format">Formato</TabsTrigger>
              <TabsTrigger value="send">Envío</TabsTrigger>
            </TabsList>
            <TabsContent value="dimensions" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-width">Ancho</Label>
                <Input
                  id="image-width"
                  type="number"
                  value={imageWidth}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-height">Alto</Label>
                <Input
                  id="image-height"
                  type="number"
                  value={imageHeight}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aspect-ratio">Relación de Aspecto</Label>
                <Select
                  value={`${Math.round(aspectRatio * 3)}:3`}
                  onValueChange={handleAspectRatioChange}
                >
                  <SelectTrigger id="aspect-ratio">
                    <SelectValue placeholder="Seleccione la relación de aspecto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="16:9">16:9</SelectItem>
                    <SelectItem value="1:1">1:1</SelectItem>
                    <SelectItem value="3:2">3:2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            <TabsContent value="format" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-format">Formato de Imagen</Label>
                <Select value={imageFormat} onValueChange={setImageFormat}>
                  <SelectTrigger id="image-format">
                    <SelectValue placeholder="Seleccione el formato de imagen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image/jpeg">JPEG</SelectItem>
                    <SelectItem value="image/png">PNG</SelectItem>
                    <SelectItem value="image/webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-quality">Calidad de Imagen</Label>
                <Slider
                  id="image-quality"
                  min={0.1}
                  max={1}
                  step={0.01}
                  value={[imageQuality]}
                  onValueChange={(value) => setImageQuality(value[0])}
                />
                <div className="text-sm text-gray-500">
                  {Math.round(imageQuality * 100)}%
                </div>
              </div>
            </TabsContent>
            <TabsContent value="send" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="endpoint-url">URL del Endpoint</Label>
                <Input
                  id="endpoint-url"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="Ingrese la URL del endpoint"
                />
              </div>
              <div className="space-y-2">
                <Label>Método de Envío</Label>
                <RadioGroup defaultValue="base64" onValueChange={setSendMethod}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="base64" id="base64" />
                    <Label htmlFor="base64">Base64</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="blob" id="blob" />
                    <Label htmlFor="blob">Blob (FormData)</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-key-name">
                  Nombre de la clave de imagen
                </Label>
                <Input
                  id="image-key-name"
                  value={imageKeyName}
                  onChange={(e) => setImageKeyName(e.target.value)}
                  placeholder="Nombre de la clave de imagen"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-preview">
                  Vista previa del objeto de solicitud
                </Label>
                <Textarea
                  id="request-preview"
                  value={JSON.stringify(getRequestBody(), null, 2)}
                  readOnly
                  className="font-mono text-sm"
                  rows={10}
                />
              </div>
            </TabsContent>
          </Tabs>
          {result && (
            <div className="mt-4 p-2 bg-gray-100 rounded-md">
              <p>{result}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
