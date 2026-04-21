/**
 * Mega Menu JavaScript
 * Handles category hover functionality to show/hide subcategories and category images
 * Works with category-link elements that have data-category attributes
 */

(function($) {
    'use strict';

    $(document).ready(function() {
        // Function to show subcategories and images for a specific category
        function showCategory(categoryName) {
            // Hide all subcategory content
            $('.subcategory-content').hide();
            $('.category-image').hide();
            
            // Show the selected category's subcategories
            $('#' + categoryName + '-subcategories').show();
            
            // Show the selected category's image
            $('#' + categoryName + '-image').show();
        }
        
        // Function to reset to first category
        function resetToFirstCategory() {
            showCategory('textil');
        }
        
        // Event listener for category links (click)
        $('.category-link').on('click', function(e) {
            e.preventDefault();
            var category = $(this).data('category');
            if (category) {
                showCategory(category);
            }
        });
        
        // Event listener for category hover
        $('.category-link').on('mouseenter', function() {
            var category = $(this).data('category');
            if (category) {
                showCategory(category);
            }
        });
        
        // Event listener for mega menu mouse leave - reset to first category
        $('.mega-menu').on('mouseleave', function() {
            resetToFirstCategory();
        });
        
        // Subcategory hover functionality
        $('.subcategory-link').on('mouseenter', function() {
            var subcategory = $(this).data('subcategory');
            if (subcategory) {
                // Hide all category images
                $('.category-image').hide();
                // Show the specific subcategory image
                $('#' + subcategory + '-subcategory-image').show();
            }
        });
        
        $('.subcategory-link').on('mouseleave', function() {
            var subcategory = $(this).data('subcategory');
            if (subcategory) {
                // Hide the subcategory image
                $('#' + subcategory + '-subcategory-image').hide();
                // Show the parent category image again
                var parentCategory = $(this).closest('.subcategory-content').attr('id');
                if (parentCategory) {
                    parentCategory = parentCategory.replace('-subcategories', '');
                    $('#' + parentCategory + '-image').show();
                }
            }
        });
        
        // Initialize with first category (TEXTIL) if it exists
        if ($('#textil-subcategories').length > 0) {
            showCategory('textil');
        }
    });

})(jQuery);

