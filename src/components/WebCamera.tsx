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
import {X, Upload, Camera} from "lucide-react";
import {ThemeToggle} from "./ThemeToggle";

export default function WebcamCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
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
  const [activeTab, setActiveTab] = useState("webcam");
  const [isDragging, setIsDragging] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [showTransformOption, setShowTransformOption] = useState(false);

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

    if (activeTab === "webcam") {
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [imageWidth, imageHeight, activeTab]);

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    };

    dropZone.addEventListener("dragover", handleDragOver);
    dropZone.addEventListener("dragenter", handleDragEnter);
    dropZone.addEventListener("dragleave", handleDragLeave);
    dropZone.addEventListener("drop", handleDrop);

    return () => {
      dropZone.removeEventListener("dragover", handleDragOver);
      dropZone.removeEventListener("dragenter", handleDragEnter);
      dropZone.removeEventListener("dragleave", handleDragLeave);
      dropZone.removeEventListener("drop", handleDrop);
    };
  }, []);

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
        setOriginalDimensions({
          width: canvasRef.current.width,
          height: canvasRef.current.height,
        });
        setCapturedImage(imageDataUrl);
        setUploadedImage(null);
        updateImageSize(imageDataUrl);
        checkImageDimensions(canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const closeCapture = () => {
    setCapturedImage(null);
    setUploadedImage(null);
    setImageSize(null);
    setOriginalDimensions(null);
    setShowTransformOption(false);
  };

  const handleFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
          const img = new Image();
          img.onload = () => {
            setOriginalDimensions({
              width: img.width,
              height: img.height,
            });
            setUploadedImage(result);
            setCapturedImage(null);
            updateImageSize(result);
            checkImageDimensions(img.width, img.height);
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert("Por favor, seleccione un archivo de imagen válido.");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
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

  const checkImageDimensions = (width: number, height: number) => {
    if (width !== imageWidth || height !== imageHeight) {
      setShowTransformOption(true);
    } else {
      setShowTransformOption(false);
    }
  };

  const transformImage = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
        const transformedImageDataUrl = canvas.toDataURL(
          imageFormat,
          imageQuality
        );
        if (capturedImage) {
          setCapturedImage(transformedImageDataUrl);
        } else if (uploadedImage) {
          setUploadedImage(transformedImageDataUrl);
        }
        updateImageSize(transformedImageDataUrl);
        setShowTransformOption(false);
      }
    };
    img.src = capturedImage || uploadedImage || "";
  };

  const downloadImage = () => {
    const imageData = capturedImage || uploadedImage;
    if (imageData) {
      const link = document.createElement("a");
      link.href = imageData;
      link.download = `image.${imageFormat.split("/")[1]}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getRequestBody = () => {
    const imageData = capturedImage || uploadedImage;

    if (!imageData) {
      return {message: "No image data available"};
    }

    if (sendMethod === "base64") {
      return {
        [imageKeyName]: imageData,
        width: imageWidth,
        height: imageHeight,
        format: imageFormat,
        quality: imageQuality,
      };
    } else if (sendMethod === "blob") {
      // For preview purposes, we'll just return a placeholder for FormData
      return {
        message: "FormData will be created when sending",
        imageKey: imageKeyName,
        width: imageWidth,
        height: imageHeight,
        format: imageFormat,
        quality: imageQuality,
      };
    }

    return {message: "Invalid send method"};
  };

  const sendImage = async () => {
    const imageData = capturedImage || uploadedImage;
    if (!imageData) {
      setResult("No image data available to send.");
      return;
    }

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
  };

  const handleWidthChange = (newWidth: number) => {
    setImageWidth(newWidth);
    if (aspectRatio !== "free") {
      const [width, height] = aspectRatio.split(":").map(Number);
      setImageHeight(Math.round((newWidth * height) / width));
    }
    if (originalDimensions) {
      checkImageDimensions(originalDimensions.width, originalDimensions.height);
    }
  };

  const handleHeightChange = (newHeight: number) => {
    setImageHeight(newHeight);
    if (aspectRatio !== "free") {
      const [width, height] = aspectRatio.split(":").map(Number);
      setImageWidth(Math.round((newHeight * width) / height));
    }
    if (originalDimensions) {
      checkImageDimensions(originalDimensions.width, originalDimensions.height);
    }
  };

  const handleAspectRatioChange = (newRatio: string) => {
    setAspectRatio(newRatio);
    if (newRatio !== "free") {
      const [width, height] = newRatio.split(":").map(Number);
      setImageHeight(Math.round((imageWidth * height) / width));
    }
    if (originalDimensions) {
      checkImageDimensions(originalDimensions.width, originalDimensions.height);
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="webcam">
                <Camera className="mr-2 h-4 w-4" />
                Webcam
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
                Subir Imagen
              </TabsTrigger>
            </TabsList>
            <TabsContent value="webcam">
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
              <div className="mt-4">
                <Button onClick={captureImage}>Capturar Imagen</Button>
              </div>
            </TabsContent>
            <TabsContent value="upload">
              <div
                ref={dropZoneRef}
                className={`relative border-2 border-dashed rounded-md p-12 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-gray-300 hover:border-primary"
                }`}
              >
                {uploadedImage ? (
                  <div className="relative">
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      className="w-full h-auto object-cover rounded-md"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={closeCapture}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Cerrar imagen</span>
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Haga clic para subir o arrastre y suelte
                    </p>
                  </>
                )}
              </div>
              <input
                title="file input"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
              />
              <div className="mt-4">
                <Button onClick={() => fileInputRef.current?.click()}>
                  Subir Imagen
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          {(capturedImage || uploadedImage) && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <h3 className="font-semibold mb-2">Detalles de la imagen:</h3>
              <p>
                Dimensiones originales: {originalDimensions?.width} x{" "}
                {originalDimensions?.height} px
              </p>
              <p>
                Dimensiones actuales: {imageWidth} x {imageHeight} px
              </p>
              <p>Formato: {imageFormat.split("/")[1].toUpperCase()}</p>
              <p>Calidad: {Math.round(imageQuality * 100)}%</p>
              <p>
                Tamaño:{" "}
                {imageSize
                  ? `${(imageSize / 1024).toFixed(2)} KB`
                  : "Calculando..."}
              </p>
              {showTransformOption && (
                <div className="mt-2">
                  <p className="text-yellow-600">
                    Las dimensiones de la imagen no coinciden con las
                    configuradas.
                  </p>
                  <Button onClick={transformImage} className="mt-2">
                    Transformar imagen
                  </Button>
                </div>
              )}
              <Button onClick={downloadImage} className="mt-2">
                Descargar imagen
              </Button>
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
                <div className="text-sm text-muted-foreground">
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
