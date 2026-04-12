#!/bin/bash
set -e

echo "🔧 Setting up NVIDIA Container Toolkit Repository..."
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

echo "📦 Installing nvidia-container-toolkit..."
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

echo "⚙️  Configuring Docker runtime..."
sudo nvidia-ctk runtime configure --runtime=docker

echo "🔄 Restarting Docker daemon..."
sudo systemctl restart docker

echo "✅ Done! GPU support should be enabled."
echo "🧪 Testing with: docker run --rm --gpus all nvidia/cuda:11.6.2-base-ubuntu20.04 nvidia-smi"
