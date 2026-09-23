"""
Tests for Whisper ONNX execution provider detection, fallback, and model-info reporting.
Ensures zero false NPU claims and accurate hardware identification.
"""

import platform
import pytest
import onnxruntime as ort

from models.whisper_engine import (
    get_best_provider,
    get_provider_label,
    WhisperONNX,
    PROVIDER_CHAIN,
)


def test_provider_chain_order():
    """Verify provider preference hierarchy: QNN (NPU) -> DML (GPU) -> CPU."""
    provider_names = [p[0] for p in PROVIDER_CHAIN]
    assert provider_names == [
        "QNNExecutionProvider",
        "DmlExecutionProvider",
        "CPUExecutionProvider",
    ]


def test_provider_labels():
    """Ensure provider labels are honest and never make false NPU claims."""
    assert get_provider_label("QNNExecutionProvider") == "Snapdragon NPU (QNN)"
    assert get_provider_label("DmlExecutionProvider") == "GPU (DirectML)"
    assert get_provider_label("CPUExecutionProvider") == "CPU fallback"
    assert "Unknown" in get_provider_label("SomeRandomProvider")


def test_current_environment_provider_detection():
    """Detect available providers in current environment."""
    available = ort.get_available_providers()
    provider, opts = get_best_provider()

    assert provider in available
    # On Intel x86_64 laptop without QNN/DML packages, must be CPUExecutionProvider
    if "QNNExecutionProvider" not in available and "DmlExecutionProvider" not in available:
        assert provider == "CPUExecutionProvider"
        assert get_provider_label(provider) == "CPU fallback"


def test_whisper_get_info_structure():
    """Verify get_info metadata contract."""
    engine = WhisperONNX(model_name="whisper-base")
    info = engine.get_info()

    assert "model_name" in info
    assert "model_format" in info
    assert "model_size_mb" in info
    assert "active_provider" in info
    assert "provider_label" in info
    assert "is_npu" in info
    assert "available_providers" in info
    assert "onnxruntime_version" in info
    assert "platform" in info
    assert "machine" in info
    assert "processor" in info

    # is_npu must be strictly True ONLY for QNNExecutionProvider
    if info["active_provider"] == "QNNExecutionProvider":
        assert info["is_npu"] is True
    else:
        assert info["is_npu"] is False


def test_system_architecture_reporting():
    """Ensure host machine architecture matches platform reporting."""
    engine = WhisperONNX(model_name="whisper-base")
    info = engine.get_info()

    assert info["machine"] == platform.machine()
    assert info["platform"] == platform.platform()
