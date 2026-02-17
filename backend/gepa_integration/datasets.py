"""
GEPA Dataset Generation for Parchi.ai
Creates training and validation sets for prompt optimization.
"""

from typing import List, Dict, Any, Tuple
from .synthetic_data import (
    generate_intake_case,
    generate_consult_case,
    generate_qa_case,
    generate_training_batch,
)


class ParchiDataset:
    """Dataset wrapper for GEPA training."""
    
    def __init__(self, examples: List[Dict[str, Any]], case_type: str):
        self.examples = examples
        self.case_type = case_type
    
    def __len__(self):
        return len(self.examples)
    
    def __getitem__(self, idx):
        return self.examples[idx]
    
    def __iter__(self):
        return iter(self.examples)


def generate_training_set(
    case_type: str = "intake_summary",
    num_examples: int = 30,
    seed: int = None
) -> ParchiDataset:
    """
    Generate training dataset for GEPA optimization.
    
    Args:
        case_type: Type of cases ("intake_summary", "consult_analysis", "patient_qa")
        num_examples: Number of training examples to generate
        seed: Random seed for reproducibility
    
    Returns:
        ParchiDataset with training examples
    """
    import random
    if seed is not None:
        random.seed(seed)
    
    examples = generate_training_batch(case_type, num_examples)
    return ParchiDataset(examples, case_type)


def generate_validation_set(
    case_type: str = "intake_summary",
    num_examples: int = 10,
    seed: int = None
) -> ParchiDataset:
    """
    Generate validation dataset for GEPA optimization.
    Uses different seed than training to ensure no overlap.
    
    Args:
        case_type: Type of cases
        num_examples: Number of validation examples
        seed: Random seed (defaults to training_seed + 1000)
    
    Returns:
        ParchiDataset with validation examples
    """
    import random
    if seed is not None:
        random.seed(seed + 1000)  # Offset to avoid overlap with training
    else:
        random.seed(42 + 1000)  # Default offset
    
    examples = generate_training_batch(case_type, num_examples)
    return ParchiDataset(examples, case_type)


def split_dataset(
    case_type: str = "intake_summary",
    total_examples: int = 50,
    train_ratio: float = 0.8,
    seed: int = 42
) -> Tuple[ParchiDataset, ParchiDataset]:
    """
    Generate and split dataset into train/validation sets.
    
    Args:
        case_type: Type of cases
        total_examples: Total number of examples to generate
        train_ratio: Fraction for training (e.g., 0.8 = 80% train, 20% val)
        seed: Random seed
    
    Returns:
        Tuple of (training_dataset, validation_dataset)
    """
    import random
    random.seed(seed)
    
    all_examples = generate_training_batch(case_type, total_examples)
    random.shuffle(all_examples)
    
    split_idx = int(len(all_examples) * train_ratio)
    train_examples = all_examples[:split_idx]
    val_examples = all_examples[split_idx:]
    
    return (
        ParchiDataset(train_examples, case_type),
        ParchiDataset(val_examples, case_type),
    )


def format_example_for_prompt(
    example: Dict[str, Any],
    case_type: str
) -> Dict[str, str]:
    """
    Format a dataset example into prompt variables.
    
    Args:
        example: Raw dataset example
        case_type: Type of case
    
    Returns:
        Dict of prompt template variables
    """
    input_data = example["input"]
    
    if case_type == "intake_summary":
        patient = input_data["patient"]
        import json
        return {
            "patient_data": json.dumps({
                "name": patient["name"],
                "age": patient.get("age", "Unknown"),
                "gender": patient.get("gender", "Unknown"),
                "conditions": patient.get("conditions", []),
                "medications": patient.get("medications", []),
                "allergies": patient.get("allergies", []),
                "vitals": patient.get("vitals", {}),
            }, indent=2),
            "documents": "\n".join(
                f"- {d['title']} ({d.get('doc_type', 'document')}): {d.get('extracted_text', '')[:300]}"
                for d in input_data.get("documents", [])
            ) or "No documents available.",
            "visits": "\n".join(
                f"- {v.get('visit_time', 'Unknown')}: {v.get('summary_ai', v.get('doctor_notes_text', ''))}"
                for v in input_data.get("visits", [])[:5]
            ) or "No previous visits.",
            "reason": input_data.get("appointment_reason", "General consultation"),
        }
    
    elif case_type == "consult_analysis":
        patient = input_data["patient"]
        vitals = patient.get("vitals", {})
        return {
            "patient_name": patient["name"],
            "patient_age": patient.get("age", "Unknown"),
            "patient_gender": patient.get("gender", "Unknown"),
            "conditions": ", ".join(patient.get("conditions", [])) or "None",
            "medications": ", ".join(patient.get("medications", [])) or "None",
            "allergies": ", ".join(patient.get("allergies", [])) or "None",
            "vitals": f"BP {vitals.get('bp_systolic', 'N/A')}/{vitals.get('bp_diastolic', 'N/A')}, SpO2 {vitals.get('spo2', 'N/A')}%, HR {vitals.get('heart_rate', 'N/A')}, Temp {vitals.get('temperature_f', 'N/A')}°F",
            "transcript": input_data.get("transcript", ""),
        }
    
    elif case_type == "patient_qa":
        patient = input_data["patient"]
        vitals = patient.get("vitals", {})
        return {
            "patient_name": patient["name"],
            "patient_age": patient.get("age", "Unknown"),
            "patient_gender": patient.get("gender", "Unknown"),
            "height_cm": patient.get("height_cm", "N/A"),
            "weight_kg": patient.get("weight_kg", "N/A"),
            "conditions": ", ".join(patient.get("conditions", [])) or "None",
            "medications": ", ".join(patient.get("medications", [])) or "None",
            "allergies": ", ".join(patient.get("allergies", [])) or "None",
            "bp": f"{vitals.get('bp_systolic', 'N/A')}/{vitals.get('bp_diastolic', 'N/A')}",
            "spo2": vitals.get("spo2", "N/A"),
            "hr": vitals.get("heart_rate", "N/A"),
            "temp": vitals.get("temperature_f", "N/A"),
            "documents": "\n".join(
                f"--- {d['title']} ({d.get('doc_type', 'document')}) ---\n{d.get('extracted_text', '')}"
                for d in input_data.get("documents", [])
            ) or "No documents on file.",
            "visits": "\n".join(
                f"--- Visit {v.get('visit_time', 'Unknown')} ---\n{v.get('summary_ai', v.get('doctor_notes_text', ''))}"
                for v in input_data.get("visits", [])
            ) or "No previous visits.",
            "consults": "No recent consult sessions.",
            "question": input_data.get("question", ""),
        }
    
    return {}
