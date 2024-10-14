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
import {X, Upload} from "lucide-react";
import {ThemeToggle} from "@/components/ThemeToggle";

export default function WebcamCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [endpointUrl, setEndpointUrl] = useState(
    "http://localhost:5000/verify-face-base64"
  );
  const [imageFormat, setImageFormat] = useState("image/jpeg");
  const [imageWidth, setImageWidth] = useState(640);
  const [imageHeight, setImageHeight] = useState(480);
  const [aspectRatio, setAspectRatio] = useState("free");
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
  }, [imageWidth, imageHeight]);

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
        setUploadedImage(null);
        updateImageSize(imageDataUrl);
      }
    }
  };

  const closeCapture = () => {
    setCapturedImage(null);
    setUploadedImage(null);
    setImageSize(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
          setUploadedImage(result);
          setCapturedImage(null);
          updateImageSize(result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert("Por favor, seleccione un archivo de imagen válido.");
    }
  };

  const updateImageSize = (imageDataUrl: string) => {
    const base64 = imageDataUrl.split(",")[1];
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    setImageSize(bytes.length);
  };

  const getRequestBody = () => {
    const imageData = capturedImage || uploadedImage;

    if (sendMethod === "base64") {
      // Si el método es base64, devolvemos el objeto como JSON
      return {
        [imageKeyName]: imageData,
        width: imageWidth,
        height: imageHeight,
        format: imageFormat,
        quality: imageQuality,
      };
    } else if (sendMethod === "blob") {
      const formData = new FormData();

      if (imageData) {
        let imageBlob: Blob;

        // Si la imagen está en base64, la convertimos a Blob
        if (imageData.startsWith("data:")) {
          const base64Data = imageData.split(",")[1]; // Quitamos el encabezado de data URL
          const contentType = imageFormat; // "image/png", "image/jpeg", etc.
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);

          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }

          const byteArray = new Uint8Array(byteNumbers);
          imageBlob = new Blob([byteArray], {type: contentType});
        } else {
          // Si ya es un archivo/Blob, lo usamos directamente
          imageBlob = new Blob([imageData], {type: imageFormat});
        }

        // Añadimos el Blob al FormData
        formData.append(
          imageKeyName,
          imageBlob,
          "image." + imageFormat.split("/")[1]
        );
        formData.append("width", imageWidth.toString());
        formData.append("height", imageHeight.toString());
        formData.append("format", imageFormat);
        formData.append("quality", imageQuality.toString());
      } else {
        // Si imageData es null, devolver un FormData vacío o manejar el error
        throw new Error("No image data available to send.");
      }

      return formData;
    }

    return {};
  };

  const sendImage = async () => {
    const imageData = capturedImage || uploadedImage;
    if (imageData) {
      setIsLoading(true);
      try {
        let body;
        if (sendMethod === "base64") {
          body = JSON.stringify(getRequestBody());
        } else if (sendMethod === "blob") {
          const response = await fetch(imageData);
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
    if (aspectRatio !== "free") {
      const [width, height] = aspectRatio.split(":").map(Number);
      setImageHeight(Math.round((newWidth * height) / width));
    }
  };

  const handleHeightChange = (newHeight: number) => {
    setImageHeight(newHeight);
    if (aspectRatio !== "free") {
      const [width, height] = aspectRatio.split(":").map(Number);
      setImageWidth(Math.round((newHeight * width) / height));
    }
  };

  const handleAspectRatioChange = (newRatio: string) => {
    setAspectRatio(newRatio);
    if (newRatio !== "free") {
      const [width, height] = newRatio.split(":").map(Number);
      setImageHeight(Math.round((imageWidth * height) / width));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full max-w-7xl mx-auto p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
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
            {(capturedImage || uploadedImage) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <img
                  src={capturedImage || uploadedImage || ""}
                  alt="Captured or Uploaded"
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
          <div className="mt-4 flex justify-between">
            <Button onClick={captureImage}>Capturar Imagen</Button>
            <div>
              <input
                title="FileImage"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" /> Subir Imagen
              </Button>
            </div>
          </div>
          {(capturedImage || uploadedImage) && (
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
          <Button
            onClick={sendImage}
            disabled={(!capturedImage && !uploadedImage) || isLoading}
          >
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
                  value={aspectRatio}
                  onValueChange={handleAspectRatioChange}
                >
                  <SelectTrigger id="aspect-ratio">
                    <SelectValue placeholder="Seleccione la relación de aspecto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Libre</SelectItem>
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
                <div className="text-sm  text-muted-foreground">
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
            <div className="mt-4 p-2 bg-muted rounded-md">
              <p>{result}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
