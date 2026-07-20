from typing import Dict, Any, List

def calculate_overall_confidence(
    validation_confidence: float,
    classifications: Dict[str, Dict[str, Any]],
    issues: List[str]
) -> Dict[str, Any]:
    """
    Module 11: Confidence Scoring Engine.
    Aggregates validation accuracy, column understanding, and unresolved parsing issues
    into a final confidence report.
    """
    # 1. Classification confidence (Average of all column classifications)
    conf_scores = [info.get("confidence", 0.5) for info in classifications.values()]
    avg_classification_conf = sum(conf_scores) / len(conf_scores) if conf_scores else 0.5
    
    # 2. Penalty for issues
    issue_penalty = len(issues) * 0.05
    
    # 3. Aggregate score
    overall_score = (validation_confidence * 0.5) + (avg_classification_conf * 0.5) - issue_penalty
    overall_score = max(0.1, min(1.0, overall_score))
    
    # 4. Status mapping
    status = "high"
    if overall_score < 0.60:
        status = "low"
    elif overall_score < 0.80:
        status = "medium"
        
    warning_message = ""
    if status == "low":
        warning_message = "Unable to generate reliable analytics for this section. Please check headers and column formats."
        
    return {
        "overallScore": round(overall_score, 2),
        "status": status,
        "validationConfidence": validation_confidence,
        "classificationConfidence": round(avg_classification_conf, 2),
        "issuesCount": len(issues),
        "warningMessage": warning_message
    }
