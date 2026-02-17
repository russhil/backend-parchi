"""
Evaluation Metrics for GEPA Prompt Optimization
Defines scoring functions for medical AI prompt outputs.
"""

import re
import json
from typing import Dict, Any, List, Optional


class BaseMetric:
    """Base class for evaluation metrics."""
    
    def __init__(self, name: str, weight: float = 1.0):
        self.name = name
        self.weight = weight
    
    def score(self, output: Any, expected: Any, context: Dict[str, Any] = None) -> float:
        """Return a score between 0 and 1."""
        raise NotImplementedError
    
    def __call__(self, output: Any, expected: Any, context: Dict[str, Any] = None) -> float:
        return self.score(output, expected, context)


class FieldExtractionMetric(BaseMetric):
    """Measures accuracy of extracted fields."""
    
    def __init__(self, required_fields: List[str], weight: float = 1.0):
        super().__init__("field_extraction", weight)
        self.required_fields = required_fields
    
    def score(self, output: Dict, expected: Dict, context: Dict = None) -> float:
        if not output or not expected:
            return 0.0
        
        total_fields = len(self.required_fields)
        matched = 0
        
        for field in self.required_fields:
            if field in output and output[field]:
                expected_val = expected.get(field, "")
                output_val = output[field]
                
                # String comparison with fuzzy matching
                if isinstance(expected_val, str) and isinstance(output_val, str):
                    if expected_val.lower() in output_val.lower() or output_val.lower() in expected_val.lower():
                        matched += 1
                    elif self._fuzzy_match(output_val, expected_val):
                        matched += 0.7
                # List comparison
                elif isinstance(expected_val, list) and isinstance(output_val, list):
                    overlap = len(set(str(v).lower() for v in output_val) & 
                                 set(str(v).lower() for v in expected_val))
                    total = max(len(expected_val), 1)
                    matched += overlap / total
                elif output_val:
                    matched += 0.3  # Partial credit for non-empty
        
        return matched / max(total_fields, 1)
    
    def _fuzzy_match(self, s1: str, s2: str, threshold: float = 0.6) -> bool:
        """Simple fuzzy string matching."""
        s1_words = set(s1.lower().split())
        s2_words = set(s2.lower().split())
        if not s1_words or not s2_words:
            return False
        overlap = len(s1_words & s2_words)
        return overlap / max(len(s1_words), len(s2_words)) >= threshold


class SchemaComplianceMetric(BaseMetric):
    """Measures if output follows expected schema/structure."""
    
    def __init__(self, expected_sections: List[str], weight: float = 1.0):
        super().__init__("schema_compliance", weight)
        self.expected_sections = expected_sections
    
    def score(self, output: str, expected: Any = None, context: Dict = None) -> float:
        if not output:
            return 0.0
        
        output_lower = output.lower()
        found = 0
        
        for section in self.expected_sections:
            if section.lower() in output_lower:
                found += 1
        
        return found / max(len(self.expected_sections), 1)


class ClinicalRelevanceMetric(BaseMetric):
    """Measures clinical relevance of medical AI outputs."""
    
    def __init__(self, weight: float = 1.0):
        super().__init__("clinical_relevance", weight)
        
        # Important clinical indicators that should be flagged
        self.critical_patterns = [
            r"⚠",  # Warning symbol
            r"abnormal",
            r"elevated",
            r"low",
            r"critical",
            r"urgent",
            r"allergy|allergic",
            r"contraindicated",
            r"interaction",
        ]
        
        # Medical terminology that indicates good understanding
        self.medical_terms = [
            r"mg|mcg|ml",
            r"BP|HR|SpO2",
            r"mmHg|bpm",
            r"OD|BD|TDS|QID|PRN|HS",
            r"diagnosis|differential",
            r"symptom|sign",
            r"vital|examination",
        ]
    
    def score(self, output: str, expected: Any = None, context: Dict = None) -> float:
        if not output:
            return 0.0
        
        score = 0.0
        max_score = 1.0
        
        # Check for critical indicators when patient has abnormal values
        if context and context.get("has_abnormal_values"):
            critical_found = any(re.search(p, output, re.IGNORECASE) 
                                for p in self.critical_patterns[:3])
            score += 0.3 if critical_found else 0.0
        else:
            score += 0.15  # Baseline if no abnormals needed
        
        # Check for medical terminology
        term_count = sum(1 for p in self.medical_terms 
                        if re.search(p, output, re.IGNORECASE))
        score += min(0.4, term_count * 0.1)
        
        # Check for structured response
        if any(marker in output for marker in ["•", "-", "1.", "2.", "###", "==="]):
            score += 0.2
        
        # Check for appropriate length (not too short, not too long)
        word_count = len(output.split())
        if 50 <= word_count <= 300:
            score += 0.15
        elif 30 <= word_count <= 500:
            score += 0.1
        
        return min(score, max_score)


class ConcisenessMetric(BaseMetric):
    """Measures if response is appropriately concise."""
    
    def __init__(self, target_words: int = 150, tolerance: float = 0.5, weight: float = 1.0):
        super().__init__("conciseness", weight)
        self.target_words = target_words
        self.tolerance = tolerance
    
    def score(self, output: str, expected: Any = None, context: Dict = None) -> float:
        if not output:
            return 0.0
        
        word_count = len(output.split())
        lower_bound = self.target_words * (1 - self.tolerance)
        upper_bound = self.target_words * (1 + self.tolerance)
        
        if lower_bound <= word_count <= upper_bound:
            return 1.0
        elif word_count < lower_bound:
            # Too short
            return max(0.3, word_count / lower_bound)
        else:
            # Too long
            return max(0.3, upper_bound / word_count)


class SOAPNoteMetric(BaseMetric):
    """Specialized metric for SOAP note evaluation."""
    
    def __init__(self, weight: float = 1.0):
        super().__init__("soap_note", weight)
        self.sections = ["subjective", "objective", "assessment", "plan"]
    
    def score(self, output: Dict, expected: Dict, context: Dict = None) -> float:
        if not output or not isinstance(output, dict):
            return 0.0
        
        soap = output.get("soap", output)
        expected_soap = expected.get("soap", expected) if expected else {}
        
        total_score = 0.0
        
        for section in self.sections:
            if section in soap and soap[section]:
                total_score += 0.15  # Section exists
                
                if expected_soap and section in expected_soap:
                    # Check for key term overlap
                    output_words = set(str(soap[section]).lower().split())
                    expected_words = set(str(expected_soap.get(section, "")).lower().split())
                    
                    if expected_words:
                        overlap = len(output_words & expected_words)
                        total_score += 0.1 * min(1.0, overlap / max(len(expected_words), 1))
        
        return min(1.0, total_score)


# Composite metrics for each prompt type

class IntakeSummaryMetric:
    """Combined metric for intake summary evaluation."""
    
    def __init__(self):
        self.field_metric = FieldExtractionMetric(
            required_fields=["chief_complaint", "onset", "severity", "findings", "context"],
            weight=0.4
        )
        self.schema_metric = SchemaComplianceMetric(
            expected_sections=["CHIEF COMPLAINT", "ONSET", "SEVERITY", "KEY FINDINGS", "RELEVANT HISTORY"],
            weight=0.2
        )
        self.clinical_metric = ClinicalRelevanceMetric(weight=0.25)
        self.concise_metric = ConcisenessMetric(target_words=120, weight=0.15)
    
    def __call__(self, output: Dict, expected: Dict, context: Dict = None) -> float:
        """Return weighted score."""
        # Parse output if it's a string
        if isinstance(output, str):
            parsed = self._parse_intake_output(output)
        else:
            parsed = output
        
        raw_output = output if isinstance(output, str) else json.dumps(output)
        
        scores = {
            "field_extraction": self.field_metric(parsed, expected, context),
            "schema_compliance": self.schema_metric(raw_output, expected, context),
            "clinical_relevance": self.clinical_metric(raw_output, expected, context),
            "conciseness": self.concise_metric(raw_output, expected, context),
        }
        
        weighted_sum = sum(
            scores[m.name] * m.weight 
            for m in [self.field_metric, self.schema_metric, self.clinical_metric, self.concise_metric]
        )
        total_weight = sum(m.weight for m in [self.field_metric, self.schema_metric, self.clinical_metric, self.concise_metric])
        
        return weighted_sum / total_weight
    
    def _parse_intake_output(self, text: str) -> Dict:
        """Parse structured text output to dict."""
        def extract_section(text: str, section_name: str) -> str:
            marker = f"=== {section_name} ==="
            if marker not in text:
                return ""
            start = text.index(marker) + len(marker)
            next_section = text.find("===", start)
            if next_section == -1:
                next_section = len(text)
            return text[start:next_section].strip()
        
        return {
            "chief_complaint": extract_section(text, "CHIEF COMPLAINT"),
            "onset": extract_section(text, "ONSET"),
            "severity": extract_section(text, "SEVERITY"),
            "findings": extract_section(text, "KEY FINDINGS").split("\n"),
            "context": extract_section(text, "RELEVANT HISTORY"),
        }


class ConsultAnalysisMetric:
    """Combined metric for consultation analysis evaluation."""
    
    def __init__(self):
        self.soap_metric = SOAPNoteMetric(weight=0.5)
        self.field_metric = FieldExtractionMetric(
            required_fields=["symptoms", "duration", "medications_discussed", "allergies_mentioned"],
            weight=0.3
        )
        self.clinical_metric = ClinicalRelevanceMetric(weight=0.2)
    
    def __call__(self, output: Dict, expected: Dict, context: Dict = None) -> float:
        if isinstance(output, str):
            try:
                output = json.loads(output)
            except json.JSONDecodeError:
                return 0.1  # Minimal score for unparseable output
        
        scores = {
            "soap_note": self.soap_metric(output, expected, context),
            "field_extraction": self.field_metric(
                output.get("extracted_facts", {}),
                expected.get("extracted_facts", {}),
                context
            ),
            "clinical_relevance": self.clinical_metric(
                json.dumps(output), expected, context
            ),
        }
        
        weighted_sum = sum(
            scores[m.name] * m.weight
            for m in [self.soap_metric, self.field_metric, self.clinical_metric]
        )
        total_weight = sum(m.weight for m in [self.soap_metric, self.field_metric, self.clinical_metric])
        
        return weighted_sum / total_weight


class PatientQAMetric:
    """Combined metric for patient Q&A evaluation."""
    
    def __init__(self):
        self.clinical_metric = ClinicalRelevanceMetric(weight=0.3)
        self.concise_metric = ConcisenessMetric(target_words=80, weight=0.3)
    
    def __call__(self, output: str, expected: Dict, context: Dict = None) -> float:
        if not output:
            return 0.0
        
        expected_answer = expected.get("answer", "") if expected else ""
        
        # Check if key information is present
        relevance_score = 0.0
        if expected_answer:
            expected_words = set(expected_answer.lower().split())
            output_words = set(output.lower().split())
            overlap = len(expected_words & output_words)
            relevance_score = min(1.0, overlap / max(len(expected_words), 1))
        
        clinical_score = self.clinical_metric(output, expected, context)
        concise_score = self.concise_metric(output, expected, context)
        
        return 0.4 * relevance_score + 0.3 * clinical_score + 0.3 * concise_score
